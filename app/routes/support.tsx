// サポートページ
// Shopify App Store審査に必須

import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "サポート | Bloom AI" },
];

export default function Support() {
  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "sans-serif",
        lineHeight: "1.8",
      }}
    >
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Bloom AI サポート</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>
        Bloom AI（運営：株式会社ソウゾウ）
      </p>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>お問い合わせ</h2>
      <p>
        ご質問・ご要望・バグ報告は、以下のメールアドレスまでお気軽にご連絡ください。
        通常2営業日以内にご返信いたします。
      </p>
      <p>
        <strong>メール：</strong>{" "}
        <a href="mailto:support@bloom-ai.app">support@bloom-ai.app</a>
      </p>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>よくある質問（FAQ）</h2>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>
        Q. AIが生成した変更を元に戻せますか？
      </h3>
      <p>
        はい。Bloom AIはすべての変更前にテーマのバックアップを自動作成します。
        チャットで「前に戻して」「ロールバック」などと入力するか、
        UIのロールバックボタンを押すことで即座に変更前の状態に戻せます。
      </p>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>
        Q. ライブ（公開中）のテーマが壊れることはありますか？
      </h3>
      <p>
        Bloom AIは<strong>ライブテーマへの直接編集を行いません</strong>。
        必ずDuplicateテーマ（バックアップ）を作成してから変更を加えるため、
        ライブのテーマに影響が出ることはありません。
        変更内容を確認してから本番反映できます。
      </p>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>
        Q. 顧客データは安全ですか？
      </h3>
      <p>
        Bloom AIは顧客の個人情報（氏名・住所・メールアドレス・決済情報等）を
        一切収集・保存・処理しません。
        扱うのはShopifyストアの設定・テーマ情報・商品情報のみです。
      </p>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>
        Q. 商品写真はどう処理されますか？
      </h3>
      <p>
        商品写真はAI分析のためにAnthropicのAPIに送信されますが、
        分析後にBloom AIのサーバーには保存されません。
        永続保存は行いません。
      </p>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>
        Q. 対応しているテーマは？
      </h3>
      <p>
        Shopify 2.0テーマ（Dawn・Impulse・Spotlightなど）に対応しています。
        settings_data.jsonを使ったセクション設定の変更が可能です。
      </p>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>
        Q. アンインストールしたらデータはどうなりますか？
      </h3>
      <p>
        アプリをアンインストールすると、48時間以内にすべてのストアデータ
        （会話履歴・テーマ変更履歴・店舗メモリ）を削除します。
      </p>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>使い方ガイド</h2>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>商品登録AI</h3>
      <ol style={{ paddingLeft: "20px" }}>
        <li>「商品登録AI」メニューを開く</li>
        <li>商品写真をアップロード（ドラッグ&ドロップまたはクリック）</li>
        <li>補足情報（価格・バリアントなど）を入力（任意）</li>
        <li>「AIで商品情報を生成する」をクリック</li>
        <li>生成された商品名・説明文・タグを確認・編集</li>
        <li>「Shopifyに登録する」をクリックして完了</li>
      </ol>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>AIチャット</h3>
      <ol style={{ paddingLeft: "20px" }}>
        <li>チャット画面でやりたいことを日本語で入力</li>
        <li>AIが変更プランを提案（Before/After・差分・リスクを表示）</li>
        <li>「OK」で実行、「修正して」で変更、「やめる」でキャンセル</li>
        <li>実行後に問題があれば「前に戻して」でロールバック</li>
      </ol>

      <hr style={{ margin: "40px 0", borderColor: "#eee" }} />
      <p style={{ color: "#999", fontSize: "14px" }}>
        © 2026 株式会社ソウゾウ. All rights reserved.
        <br />
        <a href="/privacy" style={{ color: "#999" }}>プライバシーポリシー</a>
      </p>
    </div>
  );
}
