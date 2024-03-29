import chalk from 'chalk'
import execa from 'execa'
import fse from 'fs-extra'
import globby from 'globby'
import path from 'path'
import url from 'postcss-url'
import precss from 'precss'
import { InputOptions, OutputOptions, rollup } from 'rollup'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import pluPostcss from 'rollup-plugin-postcss'
import typescript from 'rollup-plugin-typescript2'
import ts from 'typescript'
import yargs from 'yargs-parser'
import lernaJson from './lerna.json'
import externalLodash from './packages/commonjs-lodash/external.json'

interface IOpt extends InputOptions {
  output: OutputOptions[]
}

// 命令要做什么，all则编译所有包，changed则编译发生改变的包，默认为all
const type: 'all' | 'changed' | undefined = yargs(process.argv).type

// tslint:disable-next-line: no-floating-promises
run(
  ['!' + path.join(__dirname, 'packages/sass-mixin/package.json')],
  [
    'immutable/contrib/cursor',
    'react-icons/fa',
    'antd/lib/icon',
    'antd/lib/menu',
    'antd/lib/icon/style/css',
    'antd/lib/menu/style/css',
    ...externalLodash,
  ],
)

/**
 * 流程函数
 * @param external 排除
 */
async function run(ohterPkgPaths: string[] = [], external: string[] = []) {
  const pkgPaths: string[] = await getPkgPaths(lernaJson.packages)
  const optList = await rollupConfigs([...pkgPaths, ...ohterPkgPaths], external)

  // 开始编译
  await buildAll(optList)
}

/**
 * 获得要编译的pkg列表
 * @param ohterPkgPaths
 */
async function getPkgPaths(lernaPkg: string[]) {
  let pkgPaths: string[] = []
  const lernaPkgPaths = lernaPkg.map((p) => path.join(p, 'package.json'))
  if (type === 'changed') {
    const changes = await getChangedPkgPaths()
    // 如果发生改变，输出日志
    logFindChanged(changes)
    pkgPaths = changes.map((p) => path.join(p.location, 'package.json'))
  } else {
    pkgPaths = lernaPkgPaths
  }
  return pkgPaths
}

/**
 * 获得发生改变的包
 */
async function getChangedPkgPaths(): Promise<
  Array<{
    name: string
    location: string
    version: string
  }>
> {
  const { stdout } = await execa('lerna changed --json')

  const matchPkgStr = stdout.replace(/[\r\n]/g, '').match(/{.+?}/g)

  return (matchPkgStr || []).map((item) => {
    return JSON.parse(item)
  })
}

/**
 * 输出模块
 */
async function outPut(bundle: any, output: OutputOptions[]) {
  for (const out of output) {
    // await bundle.generate(outOpt)
    await bundle.write(out)
    console.log(chalk.hex('#3fda00')('output: ') + out.file)
  }
}

/**
 * 通过rollup编译optList中的所有包
 */
async function buildAll(optList: IOpt[]) {
  for (const opt of optList) {
    await buildOne(opt)
  }
}

/**
 * 通过rollup编译单个包
 */
async function buildOne(opt: IOpt) {
  console.log(chalk.hex('#009dff')('build: ') + opt.input)

  // 打包
  const bundle = await rollup({
    input: opt.input,
    plugins: opt.plugins,
    external: opt.external,
  })

  await outPut(bundle, opt.output)
}

/**
 * 打印找到发生改变的包的日志
 * @param changes 发生改变的pkg
 */
function logFindChanged(
  changes: Array<{ name: string; location: string; version: string }>,
) {
  console.log(
    chalk
      .hex('#009dff')
      .bold('find changed: ' + (changes.length === 0 ? 'nothing changed' : '')),
  )

  changes.map((item) => {
    console.log(item.name)
  })
}

/**
 * 生成rollup配置
 * @param packages 包的路径
 */
async function rollupConfigs(
  packages: string[],
  external: string[] = [],
): Promise<IOpt[]> {
  const pkgAbPaths: string[] = await globby(packages)

  return pkgAbPaths.map<any>((pPath) => {
    const pkg = fse.readJsonSync(pPath)
    const libRoot = path.join(pPath, '..')
    const isTsx = fse.existsSync(path.join(libRoot, 'src/index.tsx'))
    return {
      input: path.join(libRoot, isTsx ? 'src/index.tsx' : 'src/index.ts'),
      plugins: [
        pluPostcss({
          plugins: [url({ url: 'inline' }), precss],
          modules: {
            generateScopedName: '[local]___[hash:base64:5]',
          },
        }),
        nodeResolve({
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        }),
        typescript({
          check: false,
          tsconfigOverride: {
            compilerOptions: {
              baseUrl: libRoot,
              outDir: path.join(libRoot, 'dist'),
              allowSyntheticDefaultImports: true,
            },
            include: [path.join(libRoot, 'src')],
          },
          typescript: ts,
          tsconfig: path.join(__dirname, 'tsconfig.app.json'),
        }),
        commonjs({
          include: path.join(__dirname, 'node_modules/**'),
        }),
      ],
      external: [...Object.keys(pkg.dependencies || {}), ...external],
      output: [
        {
          file: path.join(libRoot, pkg.main),
          format: 'cjs',
          exports: 'named',
          globals: {
            react: 'React',
          },
        },
        {
          file: path.join(libRoot, pkg.module),
          format: 'esm',
          exports: 'named',
          globals: {
            react: 'React',
          },
        },
      ],
    } as IOpt
  })
}
