#!/bin/bash

# Exit on error
set -e

# Set environment variables
export NODE_ENV=test
export CI=true

# Run tests with coverage
npx jest --coverage --coverageReporters="json-summary" --coverageReporters="text" --coverageReporters="lcov" --collectCoverageFrom='src/**/*.js' --collectCoverageFrom='!**/node_modules/**' --collectCoverageFrom='!**/tests/**' --collectCoverageFrom='!**/coverage/**' --collectCoverageFrom='!**/__mocks__/**' --coverageDirectory='coverage' --coverageReporters="json-summary" --coverageReporters="text" --coverageReporters="lcov" --coverageReporters="html" --coverageThreshold='{"global":{"branches":70,"functions":70,"lines":70,"statements":70}}' --testMatch='**/tests/**/*.test.js' --testPathIgnorePatterns='/node_modules/' --testPathIgnorePatterns='/coverage/' --testEnvironment='node' --testTimeout=30000

# Check if coverage meets the threshold
COVERAGE_THRESHOLD=70
COVERAGE_FILE=coverage/coverage-summary.json
COVERAGE_OUTPUT=$(cat $COVERAGE_FILE)

# Extract coverage percentages
BRANCHES_COVERAGE=$(echo $COVERAGE_OUTPUT | grep -o '"branches":{[^}]*"pct":[0-9.]*' | grep -o '[0-9.]*$' | head -1)
FUNCTIONS_COVERAGE=$(echo $COVERAGE_OUTPUT | grep -o '"functions":{[^}]*"pct":[0-9.]*' | grep -o '[0-9.]*$' | head -1)
LINES_COVERAGE=$(echo $COVERAGE_OUTPUT | grep -o '"lines":{[^}]*"pct":[0-9.]*' | grep -o '[0-9.]*$' | head -1)
STATEMENTS_COVERAGE=$(echo $COVERAGE_OUTPUT | grep -o '"statements":{[^}]*"pct":[0-9.]*' | grep -o '[0-9.]*$' | head -1)

# Check if any coverage is below the threshold
if (( $(echo "$BRANCHES_COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )) || \
   (( $(echo "$FUNCTIONS_COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )) || \
   (( $(echo "$LINES_COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )) || \
   (( $(echo "$STATEMENTS_COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )); then
  echo "Error: Coverage is below the threshold of $COVERAGE_THRESHOLD%"
  echo "Branches: $BRANCHES_COVERAGE%"
  echo "Functions: $FUNCTIONS_COVERAGE%"
  echo "Lines: $LINES_COVERAGE%"
  echo "Statements: $STATEMENTS_COVERAGE%"
  exit 1
else
  echo "Coverage is above the threshold of $COVERAGE_THRESHOLD%"
  echo "Branches: $BRANCHES_COVERAGE%"
  echo "Functions: $FUNCTIONS_COVERAGE%"
  echo "Lines: $LINES_COVERAGE%"
  echo "Statements: $STATEMENTS_COVERAGE%"
  exit 0
fi
