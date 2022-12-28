#! /usr/bin/env bash

export TESTS_DIR="$PWD/src/tests/spec"
export TS_NODE_COMPILER_OPTIONS='{"module": "commonjs"}'
export TS_NODE_PROJECT="$TESTS_DIR/tsconfig.json"

mocha \
    --exclude "$TESTS_DIR/**/__*.ts" \
    --reporter min \
    --require ts-node/register \
    "$TESTS_DIR/**/*.ts"
