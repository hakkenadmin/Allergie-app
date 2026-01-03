-- ============================================
-- Sample Stores and Menu Items for Allergie App
-- Run this in Supabase SQL editor to populate sample data
-- ============================================

-- Create stores table if not exists
CREATE TABLE IF NOT EXISTS stores (
  id BIGSERIAL PRIMARY KEY,
  store_name TEXT NOT NULL UNIQUE,
  description TEXT,
  managing_company TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample stores
INSERT INTO stores (store_name, description, managing_company, address, phone, website) VALUES
('グリーンリーフカフェ', 'オーガニックと地元産食材にこだわる、居心地の良い近所のカフェです。', 'グリーンリーフフードグループ株式会社', '東京都渋谷区123番地', '03-1234-5678', 'https://greenleafcafe.example.com'),
('オーシャンブリーズレストラン', '毎日新鮮な魚介類を提供するシーフードレストランです。', 'オーシャンブリーズホスピタリティ株式会社', '神奈川県横浜市456番地', '045-9876-5432', 'https://oceanbreeze.example.com'),
('サンセットベーカリー&デリ', '家族経営のベーカリーとデリで、新鮮な焼き立てパンを提供しています。', 'サンセットファミリーフーズ合同会社', '大阪府大阪市789番地', '06-1111-2222', 'https://sunsetbakery.example.com')
ON CONFLICT (store_name) DO NOTHING;

-- Create menu_items table if not exists
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  menu_name TEXT NOT NULL,
  description TEXT,
  allergies DECIMAL[] NOT NULL DEFAULT '{}',
  price DECIMAL(10,2),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 30 sample menu items (10 per store)
DO $$
DECLARE
  g_id BIGINT;
  o_id BIGINT;
  s_id BIGINT;
BEGIN
  SELECT id INTO g_id FROM stores WHERE store_name = 'グリーンリーフカフェ' LIMIT 1;
  SELECT id INTO o_id FROM stores WHERE store_name = 'オーシャンブリーズレストラン' LIMIT 1;
  SELECT id INTO s_id FROM stores WHERE store_name = 'サンセットベーカリー&デリ' LIMIT 1;

  -- Allergy ID mapping (from COMMON_ALLERGIES):
  -- 1=Shrimp, 2=Crab, 3=Walnut, 4=Wheat, 5=Buckwheat, 6=Egg, 7=Milk, 8=Peanut,
  -- 9=Almond, 17=Sesame, 18=Salmon, 20=Soy
  -- Note: Using closest matches for generic terms (Fish->18=Salmon, Shellfish->1=Shrimp, Tree Nuts->9=Almond, Gluten->4=Wheat)
  
  INSERT INTO menu_items (store_id, store_name, menu_name, description, allergies, price, category) VALUES
  (g_id, 'グリーンリーフカフェ', 'オーガニックキヌアサラダ', 'キヌアとハウスビネグレットの新鮮なミックスグリーンサラダ', ARRAY[]::DECIMAL[], 1200, 'サラダ'),
  (g_id, 'グリーンリーフカフェ', 'アボカドトースト', 'サワードウにアボカドとポーチドエッグ', ARRAY[6, 4]::DECIMAL[], 980, '朝食'),
  (g_id, 'グリーンリーフカフェ', 'ビーガンブッダボウル', 'タヒニソースの玄米とロースト野菜', ARRAY[17]::DECIMAL[], 1100, 'ボウル'),
  (g_id, 'グリーンリーフカフェ', 'グリルチキンラップ', '全粒粉トルティーヤのグリルチキン', ARRAY[4]::DECIMAL[], 1050, 'ラップ'),
  (g_id, 'グリーンリーフカフェ', 'シーザーサラダ', 'パルメザンチーズとクルトンのロメインレタス', ARRAY[7, 6, 4, 18]::DECIMAL[], 950, 'サラダ'),
  (g_id, 'グリーンリーフカフェ', 'チョコレートチップクッキー', 'ダークチョコレート入り手作りクッキー', ARRAY[4, 6, 7]::DECIMAL[], 350, 'デザート'),
  (g_id, 'グリーンリーフカフェ', 'スムージーボウル', 'アサイーとグラノーラ、ココナッツ', ARRAY[]::DECIMAL[], 850, '朝食'),
  (g_id, 'グリーンリーフカフェ', 'フムスプレート', '手作りフムスとピタパン', ARRAY[17, 4]::DECIMAL[], 780, '前菜'),
  (g_id, 'グリーンリーフカフェ', 'ベジバーガー', 'ブリオッシュバンズの植物性パティ', ARRAY[4, 20]::DECIMAL[], 1150, 'バーガー'),
  (g_id, 'グリーンリーフカフェ', '抹茶ラテ', 'スチームミルク入り抹茶', ARRAY[7]::DECIMAL[], 580, '飲み物'),

  (o_id, 'オーシャンブリーズレストラン', 'グリルサーモン', 'レモンバターの大西洋サーモン', ARRAY[18, 7]::DECIMAL[], 2800, 'メイン'),
  (o_id, 'オーシャンブリーズレストラン', 'エビのスカンピ', 'ガーリックワインソースの特大エビ', ARRAY[1, 4, 7]::DECIMAL[], 2500, 'メイン'),
  (o_id, 'オーシャンブリーズレストラン', 'ロブスターロール', 'ブリオッシュのロブスターとマヨネーズ', ARRAY[1, 6, 4, 7]::DECIMAL[], 3200, 'サンドイッチ'),
  (o_id, 'オーシャンブリーズレストラン', 'フィッシュアンドチップス', 'ビールバッターのタラとフライドポテト', ARRAY[18, 4, 6]::DECIMAL[], 1800, 'メイン'),
  (o_id, 'オーシャンブリーズレストラン', 'マグロの刺身', '新鮮なマグロと醤油', ARRAY[18, 20]::DECIMAL[], 2200, '前菜'),
  (o_id, 'オーシャンブリーズレストラン', 'シーフードパエリア', 'エビ、ムール貝、イカのライス', ARRAY[1, 18]::DECIMAL[], 3500, 'メイン'),
  (o_id, 'オーシャンブリーズレストラン', 'カニのケーキ', 'レムラードソースの焼きカニケーキ', ARRAY[2, 6, 4]::DECIMAL[], 2400, '前菜'),
  (o_id, 'オーシャンブリーズレストラン', 'クラムチャウダー', 'クリーミーなクラムチャウダー', ARRAY[1, 7, 4]::DECIMAL[], 1200, 'スープ'),
  (o_id, 'オーシャンブリーズレストラン', 'グリルタコ', 'オリーブオイルとハーブ', ARRAY[1]::DECIMAL[], 2600, '前菜'),
  (o_id, 'オーシャンブリーズレストラン', 'シーフードリゾット', 'ミックスシーフードのリゾット', ARRAY[1, 18, 7]::DECIMAL[], 2900, 'メイン'),

  (s_id, 'サンセットベーカリー&デリ', 'クラシッククロワッサン', 'バターたっぷりのフランスクロワッサン', ARRAY[4, 7, 6]::DECIMAL[], 320, 'ベーカリー'),
  (s_id, 'サンセットベーカリー&デリ', 'ターキークラブサンドイッチ', '白パンのターキー、ベーコン、レタス、トマト', ARRAY[4, 6]::DECIMAL[], 980, 'サンドイッチ'),
  (s_id, 'サンセットベーカリー&デリ', 'チョコレートエクレア', 'クリーム入りパイとチョコレートグレーズ', ARRAY[4, 6, 7]::DECIMAL[], 450, 'デザート'),
  (s_id, 'サンセットベーカリー&デリ', 'ピーナッツバタークッキー', 'クラシックなピーナッツバタークッキー', ARRAY[8, 4, 6]::DECIMAL[], 280, 'ベーカリー'),
  (s_id, 'サンセットベーカリー&デリ', 'ハム&チーズパニーニ', 'チャバッタのハムとスイスチーズ', ARRAY[4, 7]::DECIMAL[], 1100, 'サンドイッチ'),
  (s_id, 'サンセットベーカリー&デリ', 'アーモンドクロワッサン', 'アーモンドペースト入り', ARRAY[9, 4, 7, 6]::DECIMAL[], 380, 'ベーカリー'),
  (s_id, 'サンセットベーカリー&デリ', 'ベジデライトサンドイッチ', '全粒粉パンの野菜とフムス', ARRAY[4, 17]::DECIMAL[], 850, 'サンドイッチ'),
  (s_id, 'サンセットベーカリー&デリ', 'ブルーベリーマフィン', 'ブルーベリー入りフレッシュマフィン', ARRAY[4, 6, 7]::DECIMAL[], 350, 'ベーカリー'),
  (s_id, 'サンセットベーカリー&デリ', 'エッグサラダサンドイッチ', '白パンのクリーミーなエッグサラダ', ARRAY[6, 4, 7]::DECIMAL[], 780, 'サンドイッチ'),
  (s_id, 'サンセットベーカリー&デリ', 'シナモンロール', 'クリームチーズフロスティングの甘いロール', ARRAY[4, 6, 7]::DECIMAL[], 420, 'ベーカリー');
END $$;



