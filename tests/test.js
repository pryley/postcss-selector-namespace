import fs                       from 'fs'
import { expect }               from 'chai'
import postcss                  from 'postcss'
import postcssSelectorNamespace from '../lib/plugin'

export function transform(input, options = {}, postcssOptions = {}) {
  return postcss()
    .use(postcssSelectorNamespace(options))
    .process(input, postcssOptions)
}

export function compareFixture(name, options, postcssOptions) {
  let { css } = transform(
    fs.readFileSync(`${__dirname}/fixtures/${name}`),
    options,
    postcssOptions
  )

  let expected = fs.readFileSync(`${__dirname}/expected/${name}`)

  expect(String(css)).to.equal(String(expected))
}

describe('Basic functionality', () => {
  it('should work', () => {
    compareFixture('basic.css', {
      selfSelector: /:--component/,
      namespace: '.namespaced'
    })
  })

  it('has a default namespace selector of :--namespace', () => {
    let { css } = transform(
      ':--namespace {}',
      { namespace: '.my-component' }
    )

    expect(String(css)).to.equal('.my-component {}')
  })

  it('works with a regexp which matches multiple selectors', () => {
    compareFixture('multiself.css', {
      selfSelector: /&|:--component/,
      namespace: '.my-component'
    })
  })

  it('works with :--namespace not being the first selector', () => {
    let { css } = transform(
      '.foo :--namespace {}',
      { namespace: '.my-component' }
    )

    expect(String(css)).to.equal('.foo .my-component {}')
  })
})

describe(':root', () => {
  it('is configurable', () => {
    let { css } = transform(
      ':root .foo {}:global .foo {}',
      { namespace: '.my-component', rootSelector: ':global' }
    )

    expect(String(css)).to.equal('.my-component :root .foo {}.foo {}')
  })

  it('does not namespace :root selectors', () => {
    compareFixture('root.css', {
      selfSelector: /:--component/,
      namespace: '.my-component'
    })
  })

  it('does namespace :root selectors if ignoreRoot is false', () => {
    let { css } = transform(
      ':root .foo {}',
      { namespace: '.my-component', ignoreRoot: false }
    )

    expect(String(css)).to.equal('.my-component :root .foo {}')
  })

  it('does drop :root if dropRoot is true', () => {
    let { css } = transform(
      ':root .foo {}',
      { namespace: '.my-component', dropRoot: false }
    )

    expect(String(css)).to.equal(':root .foo {}')
  })

  it('does not drop :root if it\'s the only selector', () => {
    let { css } = transform(
      ':root {}',
      { namespace: '.my-component', dropRoot: true }
    )

    expect(String(css)).to.equal(':root {}')
  })
})

describe('SCSS', function() {
  const syntax = require('postcss-scss')

  it('does transform basic nesting', () => {
    let { css } = transform(
      '& { .bar { color: red; } }\n' +
      '.foo { color: blue }',
      { selfSelector: '&', namespace: '.my-component' }
    )

    expect(String(css)).to.equal(
      '.my-component { .bar { color: red; } }\n' +
      '.my-component .foo { color: blue }'
    )
  })

  it('does work with single line comments', () => {
    let { css } = transform(
      '& { .bar { color: red; } }\n' +
      '//.foo { color: blue }',
      { selfSelector: '&', namespace: '.my-component' },
      { syntax }
    )

    expect(String(css)).to.equal(
      '.my-component { .bar { color: red; } }\n' +
      '//.foo { color: blue }'
    )
  })

  it('does work with rules nested in nested media queries', () => {
    compareFixture('nested-media-queries.scss',
      { namespace: '.my-component' },
      { syntax }
    )
  })

  it('works with :root selector', () => {
    let { css } = transform(
      ':root { &.bar { color: red; } }',
      { selfSelector: '&', namespace: '.my-component', dropRoot: true }
    )

    expect(String(css)).to.equal(':root { &.bar { color: red; } }')
  })
})
