const keepMe = tweet =>
  (tweet.retweet_count >= 20 || tweet.favorite_count >= 20);

export default keepMe;

