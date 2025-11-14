"use client";

import { useEffect, useState, ChangeEvent, FocusEvent } from "react";
import "./globals.css";

interface Inputs {
  todaySales: string;
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

interface ResultDetail {
  pack: number;
  gram: number;
}

interface Results {
  oyako: ResultDetail;
  gokujo: ResultDetail;
  karaage: ResultDetail;
}

export default function Home() {
  const [inputs, setInputs] = useState<Inputs>({
    todaySales: "",
    tomorrowSales: "",
    dayAfterSales: "",
    thawedOyako: "",
    thawedGokujo: "",
    thawedKaraage: "",
  });

  const [usageData, setUsageData] = useState<UsageRow[]>([]);
  const [results, setResults] = useState<Results | null>(null);

  // ⭐ 現在選択中の入力欄（今日/明日/明後日）
  const [activeField, setActiveField] = useState<keyof Inputs | null>(null);

  // 売上候補
  const presets = [
    350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 800000,
  ];

  // JSON 読み込み
  useEffect(() => {
    fetch("/meat_usage.json")
      .then((res) => res.json())
      .then((data) =>
        setUsageData(data.sort((a: UsageRow, b: UsageRow) => a.sales - b.sales))
      );
  }, []);

  // 金額入力：カンマ対応
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const noComma = value.replace(/,/g, "");
    if (noComma === "" || !isNaN(Number(noComma))) {
      setInputs((prev) => ({ ...prev, [name]: noComma }));
    }
  };

  // 入力欄をタップ → activeField 切り替え
  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof Inputs;
    setActiveField(name);
  };

  // g → pack
  const gToPack = (g: number) => g / 2000;

  // 最も近い行を返す
  const findRow = (sales: number): UsageRow => {
    if (sales <= usageData[0].sales) return usageData[0];
    if (sales >= usageData[usageData.length - 1].sales)
      return usageData[usageData.length - 1];

    return usageData.reduce((prev, curr) =>
      Math.abs(curr.sales - sales) < Math.abs(prev.sales - sales) ? curr : prev
    );
  };

  // 売上候補を「選択された欄」だけに反映
  const applyPreset = (value: number) => {
    if (!activeField) return;
    setInputs((prev) => ({
      ...prev,
      [activeField]: String(value),
    }));
  };

  // 計算
  const calculateThaw = () => {
    const t = Number(inputs.todaySales || 0);
    const tm = Number(inputs.tomorrowSales || 0);
    const af = Number(inputs.dayAfterSales || 0);

    const thawOy = Number(inputs.thawedOyako || 0);
    const thawGo = Number(inputs.thawedGokujo || 0);
    const thawKa = Number(inputs.thawedKaraage || 0);

    const rT = findRow(t);
    const rTm = findRow(tm);
    const rAf = findRow(af);

    const tOy = gToPack(rT.oyako_g);
    const tmOy = gToPack(rTm.oyako_g);
    const afOy = gToPack(rAf.oyako_g);

    const tGo = gToPack(rT.gokujo_g);
    const tmGo = gToPack(rTm.gokujo_g);
    const afGo = gToPack(rAf.gokujo_g);

    const tKa = rT.karaage_pack;
    const tmKa = rTm.karaage_pack;
    const afKa = rAf.karaage_pack;

    const calc = (thawed: number, t: number, tm: number, af: number) => {
      const left = thawed - t;
      const needPack = Math.max(Math.ceil(tm + af - left), 0);
      return {
        pack: needPack,
        gram: needPack * 2000,
      };
    };

    setResults({
      oyako: calc(thawOy, tOy, tmOy, afOy),
      gokujo: calc(thawGo, tGo, tmGo, afGo),
      karaage: calc(thawKa, tKa, tmKa, afKa),
    });
  };

  return (
    <div className="container">
      <h1>親子丼 お肉解凍量計算ツール</h1>

      {/* 売上候補 */}
      <div className="preset-box">
        <h3>売上候補（タップすると選択中の欄に反映）</h3>
        <div className="preset-grid">
          {presets.map((p, i) => (
            <button
              key={i}
              className="preset-btn"
              onClick={() => applyPreset(p)}
            >
              {p.toLocaleString()}円
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="input-area">
          {/* 売上の3日分 */}
          <div>
            <h3>売上入力</h3>

            <Input
              label="今日の売上"
              name="todaySales"
              value={inputs.todaySales}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="円"
            />

            <Input
              label="明日の売上"
              name="tomorrowSales"
              value={inputs.tomorrowSales}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="円"
            />

            <Input
              label="明後日の売上"
              name="dayAfterSales"
              value={inputs.dayAfterSales}
              onChange={handleChange}
              onFocus={handleFocus}
              activeField={activeField}
              unit="円"
            />
          </div>

          {/* お肉 */}
          <div>
            <h3>解凍済みのお肉（パック）</h3>

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
        <div className="result-box">
          <h2>今日解凍すべき量</h2>
          <ul>
            <li>
              親子肉：{results.oyako.pack} パック（{results.oyako.gram} g）
            </li>
            <li>
              極上肉：{results.gokujo.pack} パック（{results.gokujo.gram} g）
            </li>
            <li>
              鶏から：{results.karaage.pack} パック（{results.karaage.gram} g）
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

// 入力コンポーネント
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
