---
title:      "[Typescript入门] 基础开发和调试环境配置"
date:       2018-06-19
tags:
    - JS/TS
---

# [Typescript入门] 基础开发和调试环境配置

自从换了新工作之后, 有一个多月没更新博客了, 上个月发生了很多事情, 从入职到开始搬砖, 然后一波加班Combo, 到现在终于可以忙里偷闲来写(hua)博(hua)客(shui)了. 由于最近几乎没有时间继续捯饬IoT, 暂时换个话题, 结合一下最近的工作, 开一个Typescript的坑吧.

> 2020年更新：这两年TypeScript果然发展非常快，在前端领域尤其是基础库方向已经逐渐占据主流，此篇文章有小部分内容已经过时。

## 为什么需要Typescript
微软在2012年8月公开Typescript之后, 这个Javascript超集语言应该算是小众语言, 一直不温不火, 但随着ECMAScript6的发布, 以及新兴前端技术的出现, 热度在最近两年飙升. 两年前学习ES6的时候, 顺便看了一下Typescript, 那时年少无知, 觉得TS不就是ES6的语法加上啰嗦的类型声明吗, 还不如直接写ES6呢. 这两年搬了一些前端和Nodejs后端的砖后, 尤其是在入职新公司, 在现有的一个Nodejs系统基础上开发一个月, 被杂糅了多种异步调用方式(有async库, 有Promise, 还有无止境的callback hell), 无分层, 无类型, 完全动态(没事delete一个属性, 其他地方再加一个属性), 充满各种无规律无中心的EventEmitter(经常emit一个不知道是啥的字符串)的代码折磨的体无完肤之后, 我才明白TS的深意. 
1. 类型可强可弱, 能够让代码优雅而又不失灵活性, 感觉有一种动静结合的哲学
2. 更强大的OOP能力, **接口, 继承, 修饰器, 类属性访问控制, 泛型等等**一系列ES6所没有的OOP特性, 在开发大型应用时才体现出的OOP的优势
3. **静态类型和编译检查**, 避免了大量在JS中可能犯的错误
4. **可读性与可维护性**的质变, 能够知悉每一个Promise的resolve类型, 每个枚举字符串可能的值. 这些在ES中只能通过jsdoc去写在注释里, 而且无法预知运行时真正的类型的对象, 而用TS后一切尽在代码中, 当你阅读代码时, 发现类型声明像是救命稻草.
5. 大部分第三方库已经提供了类型声明文件(.d.ts), IDE自动补全与即时文档带来的开发效率提升远远大于多写一些类型声明的花费的时间   
...

说了这么多好处, 但迄今为止, 笔者还没有真正用TS开发过, 这篇记录下TS的入门之旅. 

## 搭建一个Typescript项目
#### Step1. 基础配置文件  

玩转TS只需要一个nodejs环境就可以了, 或许几年后[Deno](https://github.com/ry/deno)会替代nodejs, 但是目前tsc tslint等都还是基于nodejs的, 首先npm init新建一个项目, 初始化好package.json, 下面是一些**必要的devDependencies**
```json
"devDependencies": {
    "@types/node": "^10.1.2",
    "ts-node": "^6.1.0",
    "tslint": "^5.10.0",
    "typescript": "^2.9.1"
}
```
然后给项目添加上**tsconfig.json**和**tslint.json**文件,
- **tsconfig.json**: 配置TS项目的基础信息, 比如代码路径, 编译选项等等. 官方文档[在这里](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)和[这里](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- **tslint.json**: 类似jslint/eslint, 用于TS的代码风格检查.

下面是我自己使用的配置, 这样代码需要写在src, 并会被编译成ES6语法的JS和sourceMap到dist目录中等等, 这里tslint配置的个人比较喜欢的代码风格.
tsconfig.json
```json
{
    "compilerOptions": {
        "module": "commonjs",
        "esModuleInterop": true,
        "target": "es6",
        "noImplicitAny": true,
        "moduleResolution": "node",
        "sourceMap": true,
        "outDir": "dist",
        "allowSyntheticDefaultImports": true,
        "baseUrl": ".",
        "paths": {
            "*": [
                "node_modules/*",
                "src/types/*"
            ]
        },
        //"allowJs": true
    },
    "include": [
        "src/**/*"
    ]
}
```

tslint.json
```json
{
  "rules": {
    "class-name": true,
    "comment-format": [
      true,
      "check-space"
    ],
    "indent": [
      true,
      "spaces"
    ],
    "one-line": [
      true,
      "check-open-brace",
      "check-whitespace"
    ],
    "no-var-keyword": true,
    "quotemark": [
      true,
      "single",
      "avoid-escape"
    ],
    "semicolon": [
      true,
      "always",
      "ignore-bound-class-methods"
    ],
    "whitespace": [
      true,
      "check-branch",
      "check-decl",
      "check-operator",
      "check-module",
      "check-separator",
      "check-type"
    ],
    "typedef-whitespace": [
      true,
      {
        "call-signature": "nospace",
        "index-signature": "nospace",
        "parameter": "nospace",
        "property-declaration": "nospace",
        "variable-declaration": "nospace"
      },
      {
        "call-signature": "onespace",
        "index-signature": "onespace",
        "parameter": "onespace",
        "property-declaration": "onespace",
        "variable-declaration": "onespace"
      }
    ],
    "no-internal-module": true,
    "no-trailing-whitespace": true,
    "no-null-keyword": true,
    "prefer-const": false,
    "jsdoc-format": true
  }
}
```

#### Step2. 写一个TS文件编译运行
创建src目录并编写一个.ts文件放进去, 比如一个main.ts, 里面可以写一些TS的代码, 然后在package.json中定义一些scripts命令即可. 比如这样: 
```json
"scripts": {
    "build": "tslint -p tsconfig.json && tsc -p tsconfig.json"
},
```
让一个TS项目运行起来就是如此简单, 如果编译选项打开allowJS(不建议打开), 甚至可以像写JS一样去写TS. 但真正的项目还需要一些必要的元素, 比如**实时调试, 单元测试, 构建打包**等等. 下面分别介绍.

## 添加单元测试配置
#### Mocha
如果是用的[mocha](https://www.npmjs.com/package/mocha)作为单元测试框架配合其他断言库(should.js chai等等), 只需要指定特定require的程序即可, 即在mocha的命令行参数添加**--require ts-node/register**, 具体可以参考[rxjs](https://github.com/ReactiveX/rxjs)的测试脚本配置, 也有nyc进行覆盖率测试的例子  
  
#### Jest
**但是**个人感觉现在[jest](https://github.com/facebook/jest)似乎比mocha更受欢迎, 配置更简单, 而且像**Mock, 覆盖测试, 断言库**等特性都集于一体, 使用更方便, 添加jest需要以下几个步骤
#### Step1. 添加jest.config.js
```js
module.exports = {
  globals: {
    'ts-jest': {
      tsConfigFile: './tsconfig.json'
    }
  },
  moduleFileExtensions: [
    'ts',
    'js'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': './node_modules/ts-jest/preprocessor.js'
  },
  testMatch: [
    '**/test/**/*.test.(ts|js)'
  ],
  testEnvironment: 'node'
};
```
#### Step2. 添加相关依赖库到devDependencies
```bash
npm install jest @types/jest ts-jest --save-dev
```

#### Step3. 编写一个测试用例并执行
首先在test目录下创建一个.test.ts结尾的文件, 然后编写测试用例
```typescript
describe('test 1', () => {
  test('always pass', () => {
    expect(true).toBe(true);
  });
});
```
然后执行jest命令即可, 如果是非全局安装jest, 则需要执行npx jest, 另外一个办法是写入package.json的scripts属性中, 然后直接npm test. 添加test后的package.json片段是这样的, 还可以顺便在coverage目录下生成了一个覆盖率测试报告:
```json
"scripts": {
  "build": "tslint -p tsconfig.json && tsc -p tsconfig.json",
  "test": "jest --coverage --verbose"
},
```

## Webpack打包配置
到现在为止, 我们已经有了项目结构, 源文件, 编译配置, 单元测试的雏形, 如果是前端项目或者有代码混淆要求的后端项目, 还需要打包发布. 正好最近Webpack4也出来有一段时间了, 来体验一下号称零配置的Webpack4吧
#### Step1. 准备好必要的devDependencies
其中webpack webpack-cli ts-loader是必须的, 其他的webpack插件自行选配, clean和bundle analyzer比较实用, 像CommonChunk Uglify等Plugin已经**无需再单独配置**了, Webpack4有很多的优化, 具体不再赘述, [这里](https://segmentfault.com/a/1190000014247030)有一个简要的总结
```bash
npm install webpack webpack-cli ts-loader --save-dev
npm install clean-webpack-plugin webpack-bundle-analyzer --save-dev
```

#### Step2. 添加webpack.config.js
这是一个后端typescript项目的简单示例, 如果是前端项目, target需要修改, 还需要一些html css相关的加载和处理配置, 以及vue react库相关的.vue和.jsx的loader等等, 网上教程很多, Webpack官网的文档也很详细, [这里](https://webpack.docschina.org/configuration/)是一个翻译后的文档
```js
const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/main.ts',
  devtool: 'source-map',
  target: 'node',
  mode: 'production',
  plugins: [
    new CleanWebpackPlugin('./dist/public'),
    // 这些plugin是可选的, 也可以添加DefinePlugin或者第三方Plugin等等
    // BundleAnalyzerPlugin可视化模块依赖, 非常好用
    new BundleAnalyzerPlugin({
      analyzerMode: 'static'
    })
  ],
  module: {
    // 划重点, 定义一个ts的loader即可打包typescript
    rules: [{
      test: /\.ts$/,
      use: [
        'ts-loader'
      ]
    }]
  },
  resolve: {
    extensions: ['.ts', '.js', '.json', '.node']
  },
  optimization : {
    // Webpack4 production模式下很多opimization自动开启, 无需声明
    minimize: true,
    nodeEnv: 'production'
  },
  output: {
    // 最后输出到dist/public下, 不会与tsc的输出冲突
    filename: '[name].[hash].js',
    path: path.resolve(__dirname, './dist/public')
  }
};
```

#### Step3. 开始打包
编写好webpack.config.js后, 再在package.json中定义一些构建的scripts即可, 根据项目的不同可能需要把不同环境的webpack.config分开, 并且根据开发还是生产环境执行不同的webpack命令, 但**如果是typescript后端项目**, **webpack作为production环境**, **tsc作为开发环境**已经可以满足需要了. 至此, package.json已经有这些命令了:
```json
  "scripts": {
    "build": "tslint -p tsconfig.json && tsc -p tsconfig.json",
    "build_prod": "tslint -p tsconfig.json && webpack --config webpack.config.js --progress --color",
    "lint": "tslint -p tsconfig.json",
    "test": "jest --coverage --verbose"
  },
```
执行npm run build_prod 即可打包成一个很小的混淆后的js文件了.

## 调试Typescript
由于Typescript是JS的超集, 而且能编译成JS, 所以JS的调试方法对TS一样有效, 如果是前端项目, 浏览器中直接在sourceMap后的代码打断点就可以了. 后端项目可以用node --inspect或者node --inspect-brk去打断点调试编译后的JS代码. 如果运行不在本地, 访问chrome://inspect, 配置远程debug端口在chrome中调试也可以, WebStorm也自带远程调试的配置. 总之, JS的调试方法对TS同样适用, 但此处分享一下VS Code中更简单的调试配置(launch.json), 一键Debug源代码和单元测试.

- 对于固定入口的node程序, 在**runtimeArgs指定 --require**使用的第三方库即可实现即时调试
- 对于单元测试, 用**inspect**链接到node进程中调试即可, 但需要指定测试框架对应的启动脚本, 比如jest.js  

```json
{
  "version": "0.2.0",
  "configurations": [

    {
      "type": "node",
      "request": "launch",
      "name": "Debug",
      "runtimeArgs": [
          "-r",
          "ts-node/register"
      ],
      "args": [
        "src/main.ts"
      ],
      "cwd": "${workspaceFolder}"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Unit Test",
      "protocol": "inspector",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest.js",
      "args": [
        "main.test.ts"
      ],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## 总结
本文只是简单介绍的从0开始搭建typescript的基础开发调试环境, 对于项目开发是远远不够的. 具体项目至少还需要考虑日志, CI/CD配置, 还有一些涉及前端或后端代码细节需要考虑的比如封装Ajax, 统一的枚举和常量, 代码逻辑分层, 公共组件的封装, 状态, 会话, 路由, 鉴权等等.   
不管做什么, 这些基础配置都是类似的, 虽然简单, 但从中也能学到一些东西, Typescript的前途至少目前来看还是非常明朗的. 最近也在用TS做一些尝试, 等以后经验多一些再去总结更深入的TS使用体验吧
