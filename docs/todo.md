# todo

## features
- in local mode, for each run create one subfolder in the target folder with the basename of the folder where we started recursive image crawler. 
- analyze target web pages and write custom playwright scripts for each provider to extract images. 

## ideas
- ai agent to get image urls from target web pages


## update readme with more examples

### Examples

```bash
node src/index.js --query "test cats" --provider "google" --max-downloads 3 --output "test_downloads/google_test_cats"
node src/index.js "test cats" --provider "google" --max-downloads 3 --output "test_downloads/google_test_cats"
node src/index.js web "test cats" --provider "google" --max-downloads 3 --output "test_downloads/google_test_cats"
node src/index.js web "test cats" --provider "google" --max-downloads 3 --output "test_downloads/google_test_cats"
node src/index.js web "nature photography" --provider "unsplash" --max-downloads 3 --output "test_downloads/unsplash_test_nature"
node src/index.js web "nature photography" --provider "unsplash" --max-downloads 1 --output "test_downloads/unsplash_test_nature_fix"
node src/index.js web "nature photography" --provider "unsplash" --max-downloads 1 --output "test_downloads/unsplash_test_nature_fix_debug"
node src/index.js web "mountain landscapes" --provider "flickr" --max-downloads 3 --output "test_downloads/flickr_test_mountain_landscapes"
node src/index.js web "mountain landscapes" --provider "flickr" --max-downloads 3 --output "test_downloads/flickr_test_mountain_landscapes"
node src/index.js web "city skylines" --provider "bing" --max-downloads 3 --output "test_downloads/bing_test_city_skylines"
node src/index.js web "wildlife photography" --provider "duckduckgo" --max-downloads 3 --output "test_downloads/duckduckgo_test_wildlife"
node src/index.js web "city skylines" --provider "bing" --max-downloads 3 --output "test_downloads/bing_test_city_skylines_v2"
node src/index.js web "city skylines" --provider "bing" --max-downloads 3 --output "test_downloads/bing_test_city_skylines_v3"

npx image-crawler web "fox image large"

npx image-crawler local --min-width 640 --min-height 400 -s /Users/rupertgermann/AI
npx image-crawler local --min-width 640 --min-height 400 -s /Users/rupertgermann/AI -o
npx image-crawler local --min-width 640 --min-height 400 -s /Users/rupertgermann/AI 
npx image-crawler local --min-width 640 --min-height 400 -s /Users/rupertgermann/AI -o /Users/rupertgermann/Downloads/image-crawler/test
npx image-crawler local --min-width 640 --min-height 400 -s /Users/rupertgermann/AI -o /Users/rupertgermann/Downloads/image-crawler/test --help
npx image-crawler local --min-width 640 --min-height 400 -s /Users/rupertgermann/AI -o /Users/rupertgermann/Downloads/image-crawler/test --max-files 10000
npx image-crawler local --min-width 640 --min-height 400 -s /Users/rupertgermann/Sites -o /Users/rupertgermann/Downloads/image-crawler/test --max-files 10000
npx image-crawler local --min-width 1024 --min-height 768 -s /Users/rupertgermann/Sites -o /Users/rupertgermann/Downloads/image-crawler/test --max-files 10000


```

