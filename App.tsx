import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ====== 型定義 ======
type QAItem = {
  id: string; // full+abbr のハッシュでも良いが、今回は index でOK
  full: string; // 正式名称
  abbr: string; // 略称
  score: number; // 0-3, 正解で+1, 不正解で0に戻す
};

type Direction = "FULL_TO_ABBR" | "ABBR_TO_FULL";

// ====== 生データ（初期メニュー） ======
const RAW_MENU: Array<{ full: string; abbr: string }> = [
  { full: "味噌ラーメン", abbr: "ミ" },
  { full: "味噌コーンラーメン", abbr: "ミコ" },
  { full: "味噌納豆ラーメン", abbr: "ミ納豆" },
  { full: "味噌メンマラーメン", abbr: "ミメンマ" },
  { full: "味噌バターラーメン", abbr: "ミバ" },
  { full: "味噌ワカメラーメン", abbr: "ミワカメ" },
  { full: "味噌チャーシューメン(3g)", abbr: "サミチャ" },
  { full: "味噌チャーシューメン(5g)", abbr: "ミチャ" },
  { full: "スタミナラーメン", abbr: "スタ" },
  { full: "味噌バターコーンラーメン", abbr: "ミバコ" },
  { full: "デラックスラーメン", abbr: "DX" },
  { full: "大辛味噌ラーメン", abbr: "大辛ミ" },
  { full: "ビリカラ挽き味噌ラーメン", abbr: "Pミ" },
  { full: "ねぎ味噌ラーメン", abbr: "ネミ" },
  { full: "ねぎスタミナラーメン", abbr: "ネスタ" },
  { full: "ねぎ味噌チャーシュー麵", abbr: "ネミチャ" },
  { full: "ねぎデラックスラーメン", abbr: "ネギDX" },
  { full: "キムチ味噌ラーメン", abbr: "キムミ" },
  { full: "味噌担々麵", abbr: "三担" },
  { full: "しょうゆラーメン", abbr: "正" },
  { full: "しょうゆメンマラーメン", abbr: "正メンマ" },
  { full: "しょうゆワカメラーメン", abbr: "正ワカメ" },
  { full: "しょうゆバターコーンラーメン", abbr: "正ハコ" },
  { full: "チャーシュー麵", abbr: "チャー" },
  { full: "大辛しょうゆラーメン", abbr: "大辛正" },
  { full: "ねぎ醤油", abbr: "ネ正" },
  { full: "中華ラーメン", abbr: "中" },
  { full: "中華コーン", abbr: "中コ" },
  { full: "中華バターラーメン", abbr: "中バ" },
  { full: "ねぎ中華ラーメン", abbr: "ネ中" },
  { full: "中華チャーシューメン", abbr: "中チャ" },
  { full: "ねぎ中華チャーシューメン", abbr: "ネ中シャ" },
  { full: "塩ラーメン", abbr: "塩" },
  { full: "塩バターラーメン", abbr: "塩バ" },
  { full: "塩バターコーンラーメン", abbr: "塩バコ" },
  { full: "塩チャーシューメン", abbr: "塩チャ" },
  { full: "塩バターチャーシューメン", abbr: "塩バチャ" },
  { full: "ねぎ塩ラーメン", abbr: "ネ塩" },
  { full: "岩塩ラーメン", abbr: "G" },
  { full: "岩塩ラーメンスペシャル", abbr: "GS" },
  { full: "カレーラーメン", abbr: "カレー" },
  { full: "カレーコーン", abbr: "カレコーン" },
  { full: "カレーバターラーメン", abbr: "カレバタ" },
  { full: "カレーチャーシューメン", abbr: "カレチャ" },
  { full: "大辛カレーラーメン", abbr: "大辛カレー" },
  { full: "お子様ラーメン", abbr: "お子" },
  { full: "とんこつラーメン", abbr: "とん" },
  { full: "やさいラーメン", abbr: "やさい" },
  { full: "台湾ラーメン", abbr: "台" },
  { full: "野菜定食", abbr: "野定" },
  { full: "ぎょうざ(5個)(15時前)", abbr: "セ" },
  { full: "ぎょうざ(5個)(15時後)", abbr: "ギ" },
  { full: "メンマ盛り合わせ", abbr: "㋔メンマ" },
  { full: "野菜炒め", abbr: "㋔やさい" },
  { full: "チャーシュー盛り合わせ", abbr: "㋔チャーシュー" },
  { full: "半ライス(130g)", abbr: "半ライス" },
  { full: "ライス(200g)", abbr: "ライス" },
  { full: "ぎょうざ(5個)おみやげ", abbr: "To ギ" },
  { full: "ネギチャーシュー丼", abbr: "ネギ丼" },
  { full: "みそ味豚そば３丼", abbr: "そば３丼" },
  { full: "温玉メンマ丼", abbr: "メンマ丼" },
];

// ====== 定数 ======
const STORAGE_KEY = "menuProgressV1";
const MAX_SCORE = 3;

// ====== ユーティリティ ======
const norm = (s: string) =>
  s
    .replace(/\s+/g, "") // 空白削除
    .replace(/[‐‑‒–—―ｰ]/g, "-") // ハイフン類を統一（今は未使用だが保険）
    .toUpperCase(); // 大文字化（英字対応）

const pickWeighted = (items: QAItem[]): QAItem | null => {
  if (items.length === 0) return null;
  // スコアが低いほど重みを高く
  const weights = items.map((it) => Math.max(1, MAX_SCORE + 1 - it.score));
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    if ((r -= weights[i]) <= 0) return items[i];
  }
  return items[items.length - 1];
};

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ====== 永続化 ======
async function loadProgress(): Promise<QAItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const base: QAItem[] = RAW_MENU.map((m, i) => ({ id: String(i), full: m.full, abbr: m.abbr, score: 0 }));
  if (!raw) return base;
  try {
    const saved: QAItem[] = JSON.parse(raw);
    // マージ（新旧差分に強い）
    const byKey = new Map(saved.map((s) => [s.full + "@@" + s.abbr, s] as const));
    return base.map((b) => byKey.get(b.full + "@@" + b.abbr) ?? b);
  } catch {
    return base;
  }
}

async function saveProgress(items: QAItem[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ====== メインアプリ ======
export default function App() {
  const [items, setItems] = useState<QAItem[]>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"flash" | "mc" | "type" | "list" | "settings">("flash");
  const [direction, setDirection] = useState<Direction>("FULL_TO_ABBR");

  useEffect(() => {
    (async () => {
      const data = await loadProgress();
      setItems(data);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) saveProgress(items);
  }, [items, ready]);

  const mastered = items.filter((i) => i.score >= MAX_SCORE).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"} />
      <Header
        tab={tab}
        setTab={setTab}
        direction={direction}
        setDirection={setDirection}
        stats={`${mastered}/${items.length}`}
      />

      {!ready ? (
        <Center><Text style={styles.muted}>読み込み中…</Text></Center>
      ) : tab === "flash" ? (
        <Flashcards items={items} setItems={setItems} direction={direction} />
      ) : tab === "mc" ? (
        <MultipleChoice items={items} setItems={setItems} direction={direction} />
      ) : tab === "type" ? (
        <Typing items={items} setItems={setItems} direction={direction} />
      ) : tab === "list" ? (
        <ListView items={items} setItems={setItems} />
      ) : (
        <Settings items={items} setItems={setItems} />
      )}
    </View>
  );
}

// ====== ヘッダー/タブ ======
function Header({
  tab,
  setTab,
  direction,
  setDirection,
  stats,
}: {
  tab: string;
  setTab: (t: any) => void;
  direction: Direction;
  setDirection: (d: Direction) => void;
  stats: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>略称トレーナー</Text>
      <View style={styles.rowBetween}>
        <View style={styles.tabRow}>
          <TabBtn label="カード" active={tab === "flash"} onPress={() => setTab("flash")} />
          <TabBtn label="4択" active={tab === "mc"} onPress={() => setTab("mc")} />
          <TabBtn label="入力" active={tab === "type"} onPress={() => setTab("type")} />
          <TabBtn label="一覧" active={tab === "list"} onPress={() => setTab("list")} />
          <TabBtn label="設定" active={tab === "settings"} onPress={() => setTab("settings")} />
        </View>
        <View style={styles.rowCenter}>
          <SmallBtn
            label={direction === "FULL_TO_ABBR" ? "正→略" : "略→正"}
            onPress={() => setDirection(direction === "FULL_TO_ABBR" ? "ABBR_TO_FULL" : "FULL_TO_ABBR")}
          />
          <Text style={styles.stats}>{stats}</Text>
        </View>
      </View>
    </View>
  );
}

const TabBtn = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const SmallBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.smallBtn}>
    <Text style={styles.smallBtnText}>{label}</Text>
  </TouchableOpacity>
);

const Center = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.center}>{children}</View>
);

// ====== フラッシュカード ======
function Flashcards({ items, setItems, direction }: { items: QAItem[]; setItems: (x: QAItem[]) => void; direction: Direction }) {
  const pool = useMemo(() => items.filter((i) => i.score < MAX_SCORE), [items]);
  const [current, setCurrent] = useState<QAItem | null>(() => pickWeighted(pool));
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setCurrent(pickWeighted(pool));
    setFlipped(false);
  }, [items, direction]);

  if (!current) return <Center><Text style={styles.good}>全問マスター！🎉</Text></Center>;

  const q = direction === "FULL_TO_ABBR" ? current.full : current.abbr;
  const a = direction === "FULL_TO_ABBR" ? current.abbr : current.full;

  const mark = (correct: boolean) => {
    setItems(
      items.map((it) =>
        it.id === current.id
          ? { ...it, score: correct ? Math.min(MAX_SCORE, it.score + 1) : 0 }
          : it
      )
    );
    setFlipped(false);
    setCurrent(pickWeighted(items));
  };

  return (
    <View style={styles.body}>
      <Text style={styles.caption}>カードをタップして表裏を切替</Text>
      <TouchableOpacity onPress={() => setFlipped(!flipped)} style={styles.card}>
        <Text style={styles.cardLabel}>{flipped ? "答え" : "問題"}</Text>
        <Text style={styles.cardText}>{flipped ? a : q}</Text>
      </TouchableOpacity>
      <View style={styles.rowBetween}>
        <TouchableOpacity style={[styles.actionBtn, styles.wrong]} onPress={() => mark(false)}>
          <Text style={styles.actionText}>間違い</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.correct]} onPress={() => mark(true)}>
          <Text style={styles.actionText}>正解</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ====== 4択クイズ ======
function MultipleChoice({ items, setItems, direction }: { items: QAItem[]; setItems: (x: QAItem[]) => void; direction: Direction }) {
  const [qItem, setQItem] = useState<QAItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const makeQuestion = () => {
    const pool = items.filter((i) => i.score < MAX_SCORE);
    const pick = (pool.length > 0 ? pickWeighted(pool) : items[Math.floor(Math.random() * items.length)])!;
    const correct = direction === "FULL_TO_ABBR" ? pick.abbr : pick.full;
    const bank = direction === "FULL_TO_ABBR" ? items.map((i) => i.abbr) : items.map((i) => i.full);
    const wrongs = shuffle(bank.filter((x) => x !== correct)).slice(0, 3);
    const opts = shuffle([correct, ...wrongs]);
    setQItem(pick);
    setOptions(opts);
    setSelected(null);
  };

  useEffect(() => {
    makeQuestion();
  }, [items, direction]);

  if (!qItem) return null;

  const prompt = direction === "FULL_TO_ABBR" ? qItem.full : qItem.abbr;
  const correct = direction === "FULL_TO_ABBR" ? qItem.abbr : qItem.full;

  const choose = (opt: string) => {
    if (selected) return; // 1回のみ回答
    setSelected(opt);
    const ok = opt === correct;
    setItems(
      items.map((it) => (it.id === qItem.id ? { ...it, score: ok ? Math.min(MAX_SCORE, it.score + 1) : 0 } : it))
    );
  };

  return (
    <View style={styles.body}>
      <Text style={styles.prompt}>{prompt}</Text>
      <View style={{ gap: 10 }}>
        {options.map((opt) => {
          const isCorrect = selected && opt === correct;
          const isWrongPick = selected === opt && opt !== correct;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.option,
                selected && isCorrect && { borderColor: "#22c55e", backgroundColor: "#dcfce7" },
                selected && isWrongPick && { borderColor: "#ef4444", backgroundColor: "#fee2e2" },
              ]}
              onPress={() => choose(opt)}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ height: 16 }} />
      <SmallBtn label="次の問題" onPress={makeQuestion} />
    </View>
  );
}

// ====== 入力クイズ ======
function Typing({ items, setItems, direction }: { items: QAItem[]; setItems: (x: QAItem[]) => void; direction: Direction }) {
  const pool = useMemo(() => items.filter((i) => i.score < MAX_SCORE), [items]);
  const [qItem, setQItem] = useState<QAItem | null>(() => (pool.length ? pickWeighted(pool) : items[0]));
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"none" | "ok" | "ng">("none");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setQItem(pool.length ? pickWeighted(pool) : items[Math.floor(Math.random() * items.length)]);
    setValue("");
    setResult("none");
  }, [items, direction]);

  if (!qItem) return null;

  const question = direction === "FULL_TO_ABBR" ? qItem.full : qItem.abbr;
  const answer = direction === "FULL_TO_ABBR" ? qItem.abbr : qItem.full;

  const check = () => {
    const ok = norm(value) === norm(answer);
    setResult(ok ? "ok" : "ng");
    setItems(items.map((it) => (it.id === qItem.id ? { ...it, score: ok ? Math.min(MAX_SCORE, it.score + 1) : 0 } : it)));
  };

  const next = () => {
    setQItem(pool.length ? pickWeighted(pool) : items[Math.floor(Math.random() * items.length)]);
    setValue("");
    setResult("none");
    inputRef.current?.focus();
  };

  return (
    <View style={styles.body}>
      <Text style={styles.prompt}>{question}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        placeholder="ここに入力"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={check}
      />
      <View style={styles.rowBetween}>
        <SmallBtn label="答え合わせ" onPress={check} />
        <SmallBtn label="次へ" onPress={next} />
      </View>
      {result !== "none" && (
        <View style={[styles.feedback, result === "ok" ? styles.ok : styles.ng]}>
          <Text style={styles.feedbackText}>
            {result === "ok" ? "正解！" : `不正解… 正解：${answer}`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ====== 一覧/検索 ======
function ListView({ items, setItems }: { items: QAItem[]; setItems: (x: QAItem[]) => void }) {
  const [q, setQ] = useState("");
  const data = useMemo(() => {
    const n = norm(q);
    return items
      .filter((it) => !q || norm(it.full).includes(n) || norm(it.abbr).includes(n))
      .sort((a, b) => a.full.localeCompare(b.full, "ja"));
  }, [items, q]);

  const resetScore = (id: string) => {
    setItems(items.map((it) => (it.id === id ? { ...it, score: 0 } : it)));
  };

  return (
    <View style={styles.body}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="検索（正式名/略称）"
        style={styles.search}
      />
      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listFull}>{item.full}</Text>
              <Text style={styles.listAbbr}>{item.abbr}</Text>
            </View>
            <View style={styles.rowCenter}>
              <Text style={styles.badge}>Lv{item.score}</Text>
              <TouchableOpacity onPress={() => resetScore(item.id)} style={styles.resetBtn}>
                <Text style={styles.resetText}>リセット</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// ====== 設定 ======
function Settings({ items, setItems }: { items: QAItem[]; setItems: (x: QAItem[]) => void }) {
  const wipe = async () => {
    Alert.alert("進捗を初期化", "全ての習熟レベルを0に戻します。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "初期化する",
        style: "destructive",
        onPress: async () => {
          const reset = items.map((it) => ({ ...it, score: 0 }));
          setItems(reset);
          await saveProgress(reset);
        },
      },
    ]);
  };

  const exportJson = async () => {
    const payload = JSON.stringify(items, null, 2);
    Alert.alert("進捗JSON", payload.slice(0, 500) + (payload.length > 500 ? "\n…(続く)" : ""));
  };

  return (
    <ScrollView style={styles.body}>
      <Text style={styles.sectionTitle}>アプリ情報</Text>
      <Text style={styles.muted}>略称暗記用の軽量トレーナー。フラッシュカード/4択/入力の3モード、学習度(0-3)を保存。</Text>

      <View style={{ height: 16 }} />
      <Text style={styles.sectionTitle}>操作</Text>
      <SmallBtn label="学習進捗を初期化" onPress={wipe} />
      <View style={{ height: 8 }} />
      <SmallBtn label="進捗JSONを表示" onPress={exportJson} />

      <View style={{ height: 16 }} />
      <Text style={styles.sectionTitle}>ヒント</Text>
      <Text style={styles.muted}>・「正→略 / 略→正」はヘッダー右で切替。\n・入力は空白無視・英字は大文字小文字を無視します（例："To ギ" と "Toギ" は同一扱い）。</Text>
    </ScrollView>
  );
}

// ====== スタイル ======
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // slate-900
    paddingTop: Platform.OS === "android" ? 24 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#111827", // gray-900
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1f2937",
    gap: 10,
  },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  tabRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#111827",
  },
  tabBtnActive: { backgroundColor: "#1f2937", borderColor: "#60a5fa" },
  tabBtnText: { color: "#d1d5db" },
  tabBtnTextActive: { color: "#93c5fd", fontWeight: "700" },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#1f2937",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  smallBtnText: { color: "#cbd5e1", fontWeight: "600" },
  stats: { color: "#94a3b8", marginLeft: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 16, gap: 16 },
  caption: { color: "#94a3b8" },
  card: {
    flex: 1,
    backgroundColor: "#0b1220",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginVertical: 8,
  },
  cardLabel: { color: "#64748b", marginBottom: 6 },
  cardText: { color: "#e2e8f0", fontSize: 28, textAlign: "center", lineHeight: 36 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  actionText: { color: "#0b1220", fontWeight: "800", letterSpacing: 1 },
  wrong: { backgroundColor: "#fecaca" },
  correct: { backgroundColor: "#86efac" },
  prompt: { color: "#e2e8f0", fontSize: 22, lineHeight: 30 },
  option: {
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0b1220",
    padding: 12,
    borderRadius: 12,
  },
  optionText: { color: "#e5e7eb", fontSize: 18 },
  input: {
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "#334155",
    color: "#e5e7eb",
    padding: 12,
    fontSize: 18,
    borderRadius: 10,
  },
  feedback: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  ok: { backgroundColor: "#14532d" },
  ng: { backgroundColor: "#7f1d1d" },
  feedbackText: { color: "#f8fafc" },
  search: {
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "#334155",
    color: "#e5e7eb",
    padding: 10,
    borderRadius: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  listFull: { color: "#e5e7eb", fontSize: 16, fontWeight: "600" },
  listAbbr: { color: "#93c5fd", marginTop: 2 },
  badge: {
    color: "#fef3c7",
    backgroundColor: "#78350f",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
    fontWeight: "700",
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetText: { color: "#fecaca", fontWeight: "700" },
  sectionTitle: { color: "#e2e8f0", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  muted: { color: "#94a3b8" },
  sep: { height: 1, backgroundColor: "#1f2937" },
  good: { color: "#86efac", fontSize: 20, fontWeight: "700" },
});
