from ntscraper import Nitter
import json
import sys
import datetime

def scrape_tweets(query, count=5):
    scraper = Nitter()
    tweets = []
    try:
        # Search for tweets
        results = scraper.get_tweets(query, mode='term', number=count)
        
        for tweet in results['tweets']:
            tweets.append({
                "content": tweet['text'],
                "date": tweet['date'],
                "url": tweet['link'],
                "user": tweet['user']['username']
            })
    except Exception as e:
        print(f"Error scraping: {e}", file=sys.stderr)
    
    return tweets

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)
    
    city = sys.argv[1]
    # Search for city-specific keywords
    search_query = f"{city} traffic OR {city} rain"
    
    results = scrape_tweets(search_query, count=5)
    print(json.dumps(results))
