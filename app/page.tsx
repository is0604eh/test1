"use client";

import { useEffect, useState, ChangeEvent, FocusEvent } from "react";
import "./globals.css";

interface Inputs {
  todayActualSales: string; // ← 今日の実績売上（入力追加）
  todayPredSales: string; // ← 今日の売上予測（従来 todaySales を改名）
  tomorrowSales: string;
  dayAfterSales: string;
  thawedOyako: string;
  thawedGokujo: string;
  thawedKaraage: string;
}

interface UsageRow {
  sales: number;
  oyako_g: number;
  gokujo_g: number;
  karaage_pack: number;
}

interface CalcDetail {
  todayPredPack: number;
  todaySoFarPack: number; // 今日ここまで使った想定量
  remainingTodayUse: number; // 今日これから使う量
  leftoverEndOfDay: number; // 今日終了時点のあまり
  tomorrowNeed: number;
  dayAfterNeed: number;
}

interface ResultDetail {
  pack: number;
  gram: number;
  detail: CalcDetail;
}

interface Results {
  oyako: ResultDetail;
  gokujo: ResultDetail;
  karaage: ResultDetail;
}

export default function Home() {
  const [inputs, setInputs] = useState<Inputs>({
    todayActualSales: "",
    todayPredSales: "",
    tomorrowSales: "",
    dayAfterSales: "",
    thawedOyako: "",
    thawedGokujo: "",
    thawedKaraage: "",
  });

  const [usageData, setUsageData] = useState<UsageRow[]>([]);
  const [results, setResults] = useState<Results | null>(null);
  const [activeField, setActiveField] = useState<keyof Inputs | null>(null);

  const presets = [
    350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 800000,
  ];

  useEffect(() => {
    fetch("/meat_usage.json")
      .then((res) => res.json())
      .then((data) =>
        setUsageData(data.sort((a: UsageRow, b: UsageRow) => a.sales - b.sales))
      );
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const noComma = value.replace(/,/g, "");
    if (noComma === "" || !isNaN(Number(noComma))) {
      setInputs((prev) => ({ ...prev, [name]: noComma }));
    }
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setActiveField(e.target.name as keyof Inputs);
  };

  const applyPreset = (value: number) => {
    if (!activeField) return;
    setInputs((prev) => ({ ...prev, [activeField]: String(value) }));
  };

  const packFromSales = (
    sales: number,
    type: "oyako" | "gokujo" | "karaage"
  ) => {
    const row = findRow(sales);
    if (type === "karaage") return row.karaage_pack;
    return gToPack(type === "oyako" ? row.oyako_g : row.gokujo_g);
  };

  // g → pack
  const gToPack = (g: number) => g / 2000;

  // 最も近い行
  const findRow = (sales: number): UsageRow => {
    if (usageData.length === 0)
      return { sales: 0, oyako_g: 0, gokujo_g: 0, karaage_pack: 0 };
    if (sales <= usageData[0].sales) return usageData[0];
    if (sales >= usageData[usageData.length - 1].sales)
      return usageData[usageData.length - 1];
    return usageData.reduce((prev, curr) =>
      Math.abs(curr.sales - sales) < Math.abs(prev.sales - sales) ? curr : prev
    );
  };

  const calculateThaw = () => {
    // 売上
    const todayActual = Number(inputs.todayActualSales || 0); // today實績
    const todayPred = Number(inputs.todayPredSales || 0); // today予測
    const tomorrow = Number(inputs.tomorrowSales || 0);
    const dayAfter = Number(inputs.dayAfterSales || 0);

    // 解凍済み
    const thawOy = Number(inputs.thawedOyako || 0);
    const thawGo = Number(inputs.thawedGokujo || 0);
    const thawKa = Number(inputs.thawedKaraage || 0);

    const calc = (
      type: "oyako" | "gokujo" | "karaage",
      thawedPack: number
    ): ResultDetail => {
      const todayPredPack = packFromSales(todayPred, type);
      const todaySoFarPack = packFromSales(todayActual, type);
      const remainingTodayUse = Math.max(todayPredPack - todaySoFarPack, 0);
      const leftoverEndOfDay = thawedPack - remainingTodayUse;

      const tomorrowNeed = packFromSales(tomorrow, type);
      const dayAfterNeed = packFromSales(dayAfter, type);
      const futureNeed = tomorrowNeed + dayAfterNeed;

      const needPack = Math.max(
        Math.ceil(futureNeed - Math.max(leftoverEndOfDay, 0)),
        0
      );

      return {
        pack: needPack,
        gram: needPack * 2000,
        detail: {
          todayPredPack,
          todaySoFarPack,
          remainingTodayUse,
          leftoverEndOfDay,
          tomorrowNeed,
          dayAfterNeed,
        },
      };
    };

    setResults({
      oyako: calc("oyako", thawOy),
      gokujo: calc("gokujo", thawGo),
      karaage: calc("karaage", thawKa),
    });
  };

  return (
    <div className="container">
      <h1>お肉解凍計算ツール</h1>

      {/* 売上候補 */}
      <div className="preset-box">
        <h3>売上候補（タップで適用）</h3>
        <div className="preset-grid">
          {presets.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(p)}
              className="preset-btn"
            >
              {p.toLocaleString()}円
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="input-area">
          <div>
            <h3>🏪 今日の売上</h3>
            <Input
              label="実績（ここまで）"
              name="todayActualSales"
              value={inputs.todayActualSales}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="円"
            />
            <Input
              label="予測（1日）"
              name="todayPredSales"
              value={inputs.todayPredSales}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="円"
            />
          </div>

          <div>
            <h3>📊 明日以降の売上予測</h3>
            <Input
              label="明日"
              name="tomorrowSales"
              value={inputs.tomorrowSales}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="円"
            />
            <Input
              label="明後日"
              name="dayAfterSales"
              value={inputs.dayAfterSales}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="円"
            />
          </div>

          <div>
            <h3>🥩 解凍済み（冷蔵庫）</h3>
            <Input
              label="親子肉"
              name="thawedOyako"
              value={inputs.thawedOyako}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="パック"
            />
            <Input
              label="極上肉"
              name="thawedGokujo"
              value={inputs.thawedGokujo}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="パック"
            />
            <Input
              label="鶏から"
              name="thawedKaraage"
              value={inputs.thawedKaraage}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="パック"
            />
          </div>
        </div>

        <button className="main-btn" onClick={calculateThaw}>
          計算する
        </button>
      </div>

      {results && (
        <>
          <div className="result-box">
            <h2>📌 今日追加で解凍すべき量</h2>
            <ul>
              <li>
                親子肉：{results.oyako.pack} パック（{results.oyako.gram} g）
              </li>
              <li>
                極上肉：{results.gokujo.pack} パック（{results.gokujo.gram} g）
              </li>
              <li>
                鶏から：{results.karaage.pack} パック（{results.karaage.gram}{" "}
                g）
              </li>
            </ul>
          </div>

          <div className="detail-box">
            <h2>🧮 計算内訳</h2>
            <DetailSection title="親子肉" result={results.oyako} />
            <DetailSection title="極上肉" result={results.gokujo} />
            <DetailSection title="鶏から" result={results.karaage} />
          </div>
        </>
      )}
    </div>
  );
}

// 🧩 Input コンポーネント
interface InputProps {
  label: string;
  name: keyof Inputs;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus: (e: FocusEvent<HTMLInputElement>) => void;
  activeField: keyof Inputs | null;
  unit: string;
}

function Input({
  label,
  name,
  value,
  onChange,
  onFocus,
  activeField,
  unit,
}: InputProps) {
  const formatted = value ? Number(value).toLocaleString() : "";
  return (
    <div className="input-group">
      <label>{label}</label>
      <div className="input-flex">
        <input
          type="text"
          name={name}
          value={formatted}
          onChange={onChange}
          onFocus={onFocus}
          className={activeField === name ? "active-field" : ""}
          inputMode="numeric"
        />
        <span>{unit}</span>
      </div>
    </div>
  );
}

// 🔍 計算詳細セクション
interface DetailSectionProps {
  title: string;
  result: ResultDetail;
}

function DetailSection({ title, result }: DetailSectionProps) {
  const d = result.detail;
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      <ul>
        <li>今日の予測使用量（1日）：{d.todayPredPack.toFixed(2)} パック</li>
        <li>現在までの使用量（実績）：{d.todaySoFarPack.toFixed(2)} パック</li>
        <li>これから使う量：{d.remainingTodayUse.toFixed(2)} パック</li>
        <li>今日終了時点のあまり：{d.leftoverEndOfDay.toFixed(2)} パック</li>
        <li>明日：{d.tomorrowNeed.toFixed(2)} パック</li>
        <li>明後日：{d.dayAfterNeed.toFixed(2)} パック</li>
        <li>
          <strong>
            ⇒ 解凍が必要：{result.pack} パック（{result.gram} g）
          </strong>
        </li>
      </ul>
    </div>
  );
}
