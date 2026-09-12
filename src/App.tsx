import { useEffect, useState, type FormEvent } from "react";
import "./styles.css";

const project = {
  "id": "hxwl-10",
  "port": 5110,
  "title": "考古探方记录",
  "subtitle": "遗址探方、地层关系与出土物坐标档案",
  "stack": "React + Vite + TypeScript + CSS",
  "theme": [
    "#854d0e",
    "#047857",
    "#475569"
  ],
  "domain": "考古发掘",
  "users": [
    "发掘队员",
    "领队",
    "资料整理员"
  ],
  "metrics": [
    "探方数",
    "地层数",
    "出土物",
    "未整理记录"
  ],
  "filters": [
    "灰坑",
    "墓葬",
    "房址",
    "沟状遗迹"
  ],
  "fields": [
    "遗址",
    "探方",
    "地层",
    "遗迹单位",
    "深度",
    "土色",
    "坐标点",
    "出土物"
  ],
  "records": [
    [
      "T0203",
      "第3层",
      "灰褐土",
      "陶片12件，坐标E3N4"
    ],
    [
      "T0204",
      "H12灰坑",
      "黑褐土",
      "夹炭屑，见动物骨"
    ],
    [
      "T0301",
      "F2房址",
      "夯土面",
      "柱洞关系需复核"
    ]
  ]
};

const statusColors = ["status-ok", "status-watch", "status-danger"];

type RecordStatus = "未整理" | "已整理";

interface ExcavationRecord {
  id: string;
  site: string; // 遗址
  square: string; // 探方
  layer: string; // 地层
  unit: string; // 遗迹单位
  depth: string; // 深度
  soil: string; // 土色
  coords: string; // 坐标点
  finds: string; // 出土物
  relicType: string; // 遗迹类型
  status: RecordStatus;
}

type FormKey =
  | "site"
  | "square"
  | "layer"
  | "unit"
  | "depth"
  | "soil"
  | "coords"
  | "finds"
  | "relicType";

type FormState = Record<FormKey, string>;

const fieldKeyByLabel: Record<string, FormKey> = {
  遗址: "site",
  探方: "square",
  地层: "layer",
  遗迹单位: "unit",
  深度: "depth",
  土色: "soil",
  坐标点: "coords",
  出土物: "finds",
};

const requiredFieldLabels = ["遗址", "探方"];

const emptyForm: FormState = {
  site: "",
  square: "",
  layer: "",
  unit: "",
  depth: "",
  soil: "",
  coords: "",
  finds: "",
  relicType: "",
};

// 示例记录与 project.records 一一对应，渲染文本保持原样
const sampleRecords: ExcavationRecord[] = [
  {
    id: "sample-1",
    site: "城河遗址",
    square: "T0203",
    layer: "第3层",
    unit: "",
    depth: "0.6-0.9m",
    soil: "灰褐土",
    coords: "E3N4",
    finds: "陶片12件，坐标E3N4",
    relicType: "其他",
    status: "已整理",
  },
  {
    id: "sample-2",
    site: "城河遗址",
    square: "T0204",
    layer: "",
    unit: "H12灰坑",
    depth: "1.2m",
    soil: "黑褐土",
    coords: "E5N2",
    finds: "夹炭屑，见动物骨",
    relicType: "灰坑",
    status: "已整理",
  },
  {
    id: "sample-3",
    site: "城河遗址",
    square: "T0301",
    layer: "",
    unit: "F2房址",
    depth: "0.9m",
    soil: "夯土面",
    coords: "E2N6",
    finds: "柱洞关系需复核",
    relicType: "房址",
    status: "未整理",
  },
];

const STORAGE_KEY = "hxwl-10-records";

function loadRecords(): ExcavationRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleRecords;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return sampleRecords;
    return parsed.filter(
      (item): item is ExcavationRecord =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.square === "string"
    );
  } catch {
    return sampleRecords;
  }
}

function saveRecords(records: ExcavationRecord[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 本地存储不可用时静默降级，页面功能不受影响
  }
}

function summarize(record: ExcavationRecord): string {
  return [record.layer, record.unit, record.soil, record.finds]
    .filter(Boolean)
    .join(" · ");
}

function metaLine(record: ExcavationRecord): string {
  return [
    record.site,
    record.depth ? `深度 ${record.depth}` : "",
    record.coords ? `坐标 ${record.coords}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function MetricCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [records, setRecords] = useState<ExcavationRecord[]>(loadRecords);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [invalidFields, setInvalidFields] = useState<FormKey[]>([]);
  const [formError, setFormError] = useState("");
  const [squareQuery, setSquareQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const hasFilter = squareQuery.trim() !== "" || typeFilter !== null;
  const filteredRecords = records.filter((record) => {
    const matchType = typeFilter === null || record.relicType === typeFilter;
    const query = squareQuery.trim().toLowerCase();
    const matchSquare =
      query === "" || record.square.toLowerCase().includes(query);
    return matchType && matchSquare;
  });

  const unorganizedCount = records.filter((r) => r.status === "未整理").length;
  const metricCards = [
    { label: "记录总数", value: String(records.length) },
    {
      label: "探方数",
      value: String(
        new Set(records.map((r) => r.square.trim()).filter(Boolean)).size
      ),
    },
    {
      label: "地层数",
      value: String(
        new Set(records.map((r) => r.layer.trim()).filter(Boolean)).size
      ),
    },
    {
      label: "出土物",
      value: String(records.filter((r) => r.finds.trim() !== "").length),
    },
    { label: "未整理记录", value: String(unorganizedCount) },
  ];

  function updateField(key: FormKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setInvalidFields((prev) => prev.filter((field) => field !== key));
    setFormError("");
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing: { key: FormKey; label: string }[] = [];
    if (form.site.trim() === "") missing.push({ key: "site", label: "遗址" });
    if (form.square.trim() === "") missing.push({ key: "square", label: "探方" });
    if (form.relicType === "") missing.push({ key: "relicType", label: "遗迹类型" });
    if (missing.length > 0) {
      setInvalidFields(missing.map((item) => item.key));
      setFormError(
        `请填写必填项：${missing.map((item) => item.label).join("、")}`
      );
      return;
    }
    const record: ExcavationRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      site: form.site.trim(),
      square: form.square.trim(),
      layer: form.layer.trim(),
      unit: form.unit.trim(),
      depth: form.depth.trim(),
      soil: form.soil.trim(),
      coords: form.coords.trim(),
      finds: form.finds.trim(),
      relicType: form.relicType,
      status: "未整理",
    };
    setRecords((prev) => [record, ...prev]);
    setForm(emptyForm);
    setInvalidFields([]);
    setFormError("");
  }

  function clearFilters() {
    setSquareQuery("");
    setTypeFilter(null);
  }

  function toggleStatus(id: string) {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id
          ? {
              ...record,
              status: record.status === "未整理" ? "已整理" : "未整理",
            }
          : record
      )
    );
  }

  function handleExport() {
    const lines = filteredRecords.map((record, index) => {
      const detail = summarize(record);
      return `${index + 1}. ${record.square}（${record.relicType}）${
        detail ? ` ${detail}` : ""
      }`;
    });
    const text = [
      `${project.title} · 记录摘要`,
      `记录总数：${records.length} 条，本次导出：${filteredRecords.length} 条，未整理：${unorganizedCount} 条`,
      "",
      ...lines,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "考古探方记录摘要.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {metricCards.map((metric, index) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} index={index} />
        ))}
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>角色</h2>
          <div className="chips">
            {project.users.map((user: string) => (
              <span key={user}>{user}</span>
            ))}
          </div>
          <h2>筛选</h2>
          <label className="filter-field">
            <span>按探方</span>
            <input
              value={squareQuery}
              onChange={(event) => setSquareQuery(event.target.value)}
              placeholder="输入探方编号，如 T0203"
            />
          </label>
          <p className="filter-label">按遗迹类型</p>
          <div className="chips muted">
            {project.filters.map((filter: string) => (
              <button
                key={filter}
                type="button"
                className={typeFilter === filter ? "active" : ""}
                aria-pressed={typeFilter === filter}
                onClick={() =>
                  setTypeFilter((prev) => (prev === filter ? null : filter))
                }
              >
                {filter}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="clear-filter"
            onClick={clearFilters}
            disabled={!hasFilter}
          >
            清空筛选
          </button>
        </aside>

        <section className="panel">
          <form onSubmit={handleAdd} noValidate>
            <div className="section-heading">
              <div>
                <p>{project.domain}</p>
                <h2>记录字段</h2>
              </div>
              <button type="submit" className="primary-action">新增记录</button>
            </div>
            <div className="field-grid">
              {project.fields.map((field: string) => {
                const key = fieldKeyByLabel[field];
                const required = requiredFieldLabels.includes(field);
                return (
                  <label key={field}>
                    <span>
                      {field}
                      {required && <em className="required-mark">*</em>}
                    </span>
                    <input
                      value={form[key]}
                      className={invalidFields.includes(key) ? "field-error" : ""}
                      placeholder={"填写" + field}
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  </label>
                );
              })}
              <label>
                <span>
                  遗迹类型<em className="required-mark">*</em>
                </span>
                <select
                  value={form.relicType}
                  className={invalidFields.includes("relicType") ? "field-error" : ""}
                  onChange={(event) => updateField("relicType", event.target.value)}
                >
                  <option value="">选择遗迹类型</option>
                  {project.filters.map((filter: string) => (
                    <option key={filter} value={filter}>{filter}</option>
                  ))}
                  <option value="其他">其他</option>
                </select>
              </label>
            </div>
            {formError && (
              <p className="form-error" role="alert">{formError}</p>
            )}
          </form>
        </section>
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>
              共 {records.length} 条记录
              {hasFilter && `，当前筛选出 ${filteredRecords.length} 条`}
            </p>
            <h2>近期记录</h2>
          </div>
          <button type="button" onClick={handleExport}>导出摘要</button>
        </div>
        <div className="record-list">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">
              没有匹配的记录，试试清空筛选或新增一条记录。
            </div>
          ) : (
            filteredRecords.map((record, index) => (
              <article key={record.id} className="record-card">
                <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <h3>
                    {record.square}
                    <span className="relic-tag">{record.relicType}</span>
                  </h3>
                  <p>{summarize(record)}</p>
                  {metaLine(record) && (
                    <p className="record-meta">{metaLine(record)}</p>
                  )}
                </div>
                <div className="record-actions">
                  <span
                    className={
                      record.status === "未整理"
                        ? "status-tag status-tag-warn"
                        : "status-tag status-tag-ok"
                    }
                  >
                    {record.status}
                  </span>
                  <button type="button" onClick={() => toggleStatus(record.id)}>
                    {record.status === "未整理" ? "标记已整理" : "标记未整理"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
