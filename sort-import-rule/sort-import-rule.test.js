const {RuleTester} = require('eslint')
const rule = require('./sort-import-rule')

const ruleTester = new RuleTester({
  parserOptions: {ecmaVersion: 2020, sourceType: 'module', parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"]}
})

ruleTester.run('sort-import', rule, {
  valid: [
    {code: 'const a = 5;'},
    {code: 'import a from "b"'},
    {code: `
      import fs from 'fs';
    `},
    {code: `
    import { call } from "typed-redux-saga";
    
    import { pluralize } from "../../../../lib/utils";
    `},
    {code:`
    import fs from 'fs';
    import _ from 'lodash';
    import path from 'path';
    
    const dynamic = import("my-dynamic-import");
    `,}
  ],
  invalid: [
  ]
})

