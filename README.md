# Airbrush

Automatically delete tweets. h/t John O'Nolan for the inspiration.

## Setup
* Clone the repo
```
git clone git@github.com:jongold/airbrush.git && cd airbrush
cp .env.example .env
```

* [Register](https://apps.twitter.com/app/new) a new Twitter App, give it all permissions.
* Fill your consumer key/secret and access token key/secret in `.env`
* Request your Twitter archive and move the CSV to `tweets.csv`.
* **Configure the tweets you wish to keep** in `keepMe.js`. In this example, we
  keep tweets with more than 20 RTs OR favs.
```js
const keepMe = tweet =>
  (tweet.retweet_count >= 20 || tweet.favorite_count >= 20);
```

* `docker-compose up`
* Pray it doesn't delete the wrong stuff. It might do. Sorry.


