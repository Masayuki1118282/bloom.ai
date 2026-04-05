// プライバシーポリシーページ
// Shopify App Store審査に必須

import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "プライバシーポリシー | Bloom AI" },
];

export default function Privacy() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif", lineHeight: "1.8" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>プライバシーポリシー</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>
        Bloom AI（運営：株式会社ソウゾウ）
        <br />
        最終更新日：2026年3月31日
      </p>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>1. 収集する情報</h2>
      <p>
        Bloom AIは、Shopifyストアの運営に必要な以下の情報のみを収集します：
      </p>
      <ul>
        <li>Shopifyストア識別子（shop domain）</li>
        <li>AIとの会話履歴（ストア改善の指示内容）</li>
        <li>テーマ変更履歴（ロールバックのため）</li>
        <li>ストアのブランド設定（AI学習のため）</li>
        <li>商品登録用に送信された画像（処理後に削除）</li>
      </ul>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>2. 収集しない情報（重要）</h2>
      <p>
        Bloom AIは、以下の情報を<strong>一切収集・保存・処理しません</strong>：
      </p>
      <ul>
        <li>顧客の氏名・住所・電話番号・メールアドレス</li>
        <li>顧客の決済情報・クレジットカード情報</li>
        <li>顧客の注文履歴・購買行動</li>
        <li>ストアの売上・財務情報（Phase 2まで）</li>
      </ul>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>3. 情報の利用目的</h2>
      <ul>
        <li>AIによるストアデザイン提案・実行</li>
        <li>商品登録の自動化</li>
        <li>変更履歴の管理とロールバック機能の提供</li>
        <li>ストア固有のAI学習（パーソナライゼーション）</li>
      </ul>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>4. データの保管と保護</h2>
      <ul>
        <li>データはSupabase（PostgreSQL）で安全に保管されます</li>
        <li>Row Level Security（RLS）により、各ストアのデータは完全に分離されます</li>
        <li>通信はすべてHTTPS（TLS 1.2以上）で暗号化されます</li>
        <li>Anthropic Claude APIへの通信は最小限の情報のみ送信します</li>
      </ul>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>5. データの共有</h2>
      <p>
        Bloom AIは、以下の場合を除き、お客様のデータを第三者と共有しません：
      </p>
      <ul>
        <li>Anthropic（AI処理のためのAPI呼び出し。個人情報は送信しません）</li>
        <li>法的要求がある場合</li>
      </ul>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>6. データの削除</h2>
      <p>
        アプリをアンインストールした場合、48時間以内にすべてのストアデータを削除します。
        削除を要求する場合は、support@bloom-ai.app までご連絡ください。
      </p>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>7. GDPRへの対応</h2>
      <p>
        Bloom AIは、ShopifyのGDPR要件に完全準拠しています：
      </p>
      <ul>
        <li>顧客データ開示要求（customers/data_request）への対応</li>
        <li>顧客データ削除要求（customers/redact）への対応</li>
        <li>ストアデータ削除要求（shop/redact）への対応</li>
      </ul>
      <p>
        Bloom AIは顧客の個人情報を保存しないため、顧客データ開示・削除要求に対しては「保持データなし」と応答します。
      </p>

      <h2 style={{ fontSize: "20px", marginTop: "32px" }}>8. お問い合わせ</h2>
      <p>
        プライバシーに関するご質問は、以下までお問い合わせください：
        <br />
        メール：support@bloom-ai.app
        <br />
        会社名：株式会社ソウゾウ
      </p>

      <hr style={{ margin: "40px 0", borderColor: "#eee" }} />
      <p style={{ color: "#999", fontSize: "14px" }}>
        © 2026 株式会社ソウゾウ. All rights reserved.
      </p>
    </div>
  );
}
