import CopyWebpackPlugin from 'copy-webpack-plugin';
import { glob } from 'glob';
import path from 'path';
import webpack from 'webpack';

const config: webpack.Configuration = {
    entry: (() => {
        const files = glob.sync(`chromium/src/**/*.ts`);
        return files.reduce((entries: { [key: string]: string }, file) => {
            const name = path.basename(file, '.ts');
            entries[name] = '/' + file;
            return entries;
        }, {});
    })(),
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        filename: 'js/[name].js',
        path: path.resolve(__dirname, '../dist/chromium'),
        clean: true,
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: 'chromium/manifest.json' }, { from: 'static' }, { from: 'assets', to: 'img' }],
        }),
    ],
};

export default config;
