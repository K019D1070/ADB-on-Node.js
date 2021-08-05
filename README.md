# adbをNode.jsで使えるようにするやつ

## About / 概要

Android 11でのファイルアクセスに関する変更で/storage/emulated/0/Android/data/[パッケージ名]へのアクセスがいくつかのケースでできなくなった。

私が日常的に利用していた[FTP Server](https://play.google.com/store/apps/details?id=com.theolivetree.ftpserver&hl=ja&gl=US)+FFFTPでスマホからWindows PCに無線でファイルを転送するという方法は使えなくなってしまった。

私の利用法ではFFFTPの"コピー元のファイルがコピー先のファイルよりも大きい場合上書き"という上書き条件を必要としているのでUSBケーブルによるMTP接続では不満である。
(あとすごく昔の個人的なイメージであるがMTPは遅い)

そこでandroid debug bridgeを用いて所望の操作を行うことを目指した。

Shell Scriptやバッチファイルによる動作も考えたが`adb shell "ls ~"`から情報を引っこ抜いて`adb pull "~"`する関係上文字処理などにおいて使い慣れており,非同期I/Oおよびマルチスレッド処理が行えるためNode.js上で動作するようにした。

index.mjsはADB.mjsの使用例になるのかこれ？

ADB.mjsはその副産物でペアリングとか接続の面倒を見るやつである。

特定の用途にしか使えないニッチなツールを作ったときってどこらへんまで公開すべきなんだ？

てかNode.jsのADBラッパーって他にちゃんとしたのがあるっぽいし車輪の再発明では？

バッチスクリプトの代用で書いてるからこまけえこたあいいんだよ！

WSLでしか動作確認してないです

## Instructions / 使用法

プロジェクトのルートにadbフォルダを作成し,中にplatform-toolsよりadbのバイナリ(Windowsの場合は動作に必要なdllも一緒に)を入れる。

ADBをインスタンス化するとコンソールにペアリングとか接続のプロンプトが出るので無線の場合はそれに従う。
有線でいい場合は普通につないでデバッグを有効化する。

```
import ADB from ./src/ADB.mjs

const adb = new ADB();
```