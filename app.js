const Twit = require('twit');
const fs = require('fs');
const kue = require('kue');
const parse = require('csv-parse');
const { compose, forEach, partition, pluck, splitEvery } = require('ramda');
const keepMe = require('./keepMe');

const log = x => console.log(x); // eslint-disable-line no-console

// Auth to Twitter
const T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

// const FETCH_TWEETS = 'fetch-tweets';
const DELETE_TWEET = 'delete-tweet';
const LOOKUP_TWEETS = 'lookup-tweets';

// Twitter Rate Limit for posts is 15m
// const RATE_LIMIT = 15 * 60 * 1000;

const jobs = kue.createQueue({
  redis: {
    host: 'redis',
  },
});

const scheduleDelete = tweet =>
  jobs.create(DELETE_TWEET, Object.assign({}, tweet, {
    title: tweet.text,
  })).save();

jobs.process(DELETE_TWEET, 15, (job, done) => {
  const tweet = job.data;

  T.post('statuses/destroy/:id', {
    id: tweet.id_str,
  }, (error) => {
    if (error) {
      return done(error);
    }
    return done();
  });
});

const KUE_PORT = 3000;
kue.app.listen(KUE_PORT, () => {
  log(`Kue UI listening on port ${KUE_PORT}`);
});

process.once('SIGTERM', () => {
  jobs.shutdown(5000, (err) => {
    log('Kue shutdown: ', err || '');
    process.exit(0);
  });
});

const lookupTweets = (ids) => {
  jobs.create(LOOKUP_TWEETS, {
    ids: ids.join(','),
  }).save();
};

jobs.process(LOOKUP_TWEETS, (job, done) => {
  T.get('statuses/lookup', {
    id: job.data.ids,
    include_entities: false,
    trim_user: true,
  }, (err, tweets) => {
    if (err) {
      log(err);
      done(err);
    }

    compose(
      forEach(scheduleDelete),
      (([pass, fail]) => {
        log(`✨ Keeping:\n${pluck('text', pass)}`);
        log(`⚰ Deleting ${fail.length} tweets`);
        return fail;
      }),
      partition(keepMe),
    )(tweets);

    done();
  });
});

const in100s = splitEvery(100);

const readCSV = (csvPath, callback) =>
  fs.createReadStream(csvPath, { encoding: 'utf-8' })
    .pipe(parse({ columns: true }, callback));

const processCSV = compose(
  // forEach(lookupTweets),
  in100s,
  pluck('tweet_id'),
);


if (process.argv.length <= 2) {
  log('Pass in your Twitter archive .csv');
  process.exit(-1);
}

const archivePath = process.argv[2];
readCSV(archivePath, (err, data) => {
  if (err) {
    throw err;
  }

  processCSV(data);
});
