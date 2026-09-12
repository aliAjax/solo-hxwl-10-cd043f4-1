import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const STORAGE_KEY = "hxwl-10-records";

type User = ReturnType<typeof userEvent.setup>;

function metricValue(label: string): string | null | undefined {
  const span = screen
    .getAllByText(label)
    .find((el) => el.closest(".metric-card") !== null);
  return span?.closest(".metric-card")?.querySelector("strong")?.textContent;
}

function storedRecords(): Array<{ square: string; status: string }> {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
}

async function addRecord(
  user: User,
  overrides?: { site?: string; square?: string; type?: string }
) {
  await user.type(
    screen.getByPlaceholderText("填写遗址"),
    overrides?.site ?? "城河遗址"
  );
  await user.type(
    screen.getByPlaceholderText("填写探方"),
    overrides?.square ?? "T0401"
  );
  await user.selectOptions(
    screen.getByRole("combobox"),
    overrides?.type ?? "墓葬"
  );
  await user.click(screen.getByRole("button", { name: "新增记录" }));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("考古探方记录页", () => {
  it("旧功能：看板指标、示例记录、角色、筛选项与录入字段保持可用", () => {
    render(<App />);

    // 看板指标基于示例记录计算
    expect(metricValue("记录总数")).toBe("3");
    expect(metricValue("探方数")).toBe("3");
    expect(metricValue("地层数")).toBe("1");
    expect(metricValue("出土物")).toBe("3");
    expect(metricValue("未整理记录")).toBe("1");

    // 示例记录原文保留
    expect(
      screen.getByRole("heading", { name: /T0203/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText("第3层 · 灰褐土 · 陶片12件，坐标E3N4")
    ).toBeInTheDocument();
    expect(
      screen.getByText("H12灰坑 · 黑褐土 · 夹炭屑，见动物骨")
    ).toBeInTheDocument();
    expect(
      screen.getByText("F2房址 · 夯土面 · 柱洞关系需复核")
    ).toBeInTheDocument();

    // 角色与遗迹类型筛选项
    expect(screen.getByText("发掘队员")).toBeInTheDocument();
    expect(screen.getByText("资料整理员")).toBeInTheDocument();
    for (const filter of ["灰坑", "墓葬", "房址", "沟状遗迹"]) {
      expect(
        screen.getByRole("button", { name: filter })
      ).toBeInTheDocument();
    }

    // 8 个录入字段
    for (const field of [
      "遗址",
      "探方",
      "地层",
      "遗迹单位",
      "深度",
      "土色",
      "坐标点",
      "出土物",
    ]) {
      expect(screen.getByPlaceholderText(`填写${field}`)).toBeInTheDocument();
    }
  });

  it("新增：提交后记录入列表，记录总数与未整理记录同步变化", async () => {
    const user = userEvent.setup();
    render(<App />);

    await addRecord(user, { square: "T0401", type: "墓葬" });

    expect(screen.getByRole("heading", { name: /T0401/ })).toBeInTheDocument();
    expect(screen.getByText(/共 4 条记录/)).toBeInTheDocument();
    expect(metricValue("记录总数")).toBe("4");
    expect(metricValue("探方数")).toBe("4");
    expect(metricValue("未整理记录")).toBe("2");

    // 新增后表单重置
    expect(screen.getByPlaceholderText("填写探方")).toHaveValue("");
    expect(screen.getByPlaceholderText("填写遗址")).toHaveValue("");

    // 新记录默认未整理，标记已整理后未整理数回落
    const card = screen
      .getByRole("heading", { name: /T0401/ })
      .closest(".record-card") as HTMLElement;
    await user.click(
      within(card).getByRole("button", { name: "标记已整理" })
    );
    expect(metricValue("未整理记录")).toBe("1");
  });

  it("空字段拦截：必填项为空时提示并阻止新增", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "新增记录" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请填写必填项：遗址、探方、遗迹类型"
    );
    expect(metricValue("记录总数")).toBe("3");
    expect(storedRecords()).toHaveLength(3);

    // 只填一部分仍然拦截，并提示剩余缺项
    await user.type(screen.getByPlaceholderText("填写遗址"), "城河遗址");
    await user.click(screen.getByRole("button", { name: "新增记录" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请填写必填项：探方、遗迹类型"
    );
    expect(metricValue("记录总数")).toBe("3");
    expect(storedRecords()).toHaveLength(3);
  });

  it("筛选：按探方、按遗迹类型筛选，并可一键清空", async () => {
    const user = userEvent.setup();
    render(<App />);

    const clearButton = screen.getByRole("button", { name: "清空筛选" });
    expect(clearButton).toBeDisabled();

    // 按探方筛选
    await user.type(
      screen.getByPlaceholderText("输入探方编号，如 T0203"),
      "T0203"
    );
    expect(screen.getByRole("heading", { name: /T0203/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /T0204/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/当前筛选出 1 条/)).toBeInTheDocument();

    // 清空后恢复全部
    await user.click(clearButton);
    expect(
      screen.getByPlaceholderText("输入探方编号，如 T0203")
    ).toHaveValue("");
    expect(screen.getByRole("heading", { name: /T0204/ })).toBeInTheDocument();

    // 按遗迹类型筛选
    await user.click(screen.getByRole("button", { name: "灰坑" }));
    expect(screen.getByRole("button", { name: "灰坑" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      screen.queryByRole("heading", { name: /T0203/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /T0204/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /T0301/ })
    ).not.toBeInTheDocument();

    // 组合筛选无结果时给出空状态提示
    await user.type(
      screen.getByPlaceholderText("输入探方编号，如 T0203"),
      "T0301"
    );
    expect(screen.getByText(/没有匹配的记录/)).toBeInTheDocument();

    // 再次清空，三条示例记录全部回来
    await user.click(clearButton);
    expect(screen.getByRole("heading", { name: /T0203/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /T0204/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /T0301/ })).toBeInTheDocument();
  });

  it("刷新保留：新增的记录写入本地存储，重新挂载后仍在", async () => {
    const user = userEvent.setup();
    const first = render(<App />);

    await addRecord(user, { square: "T0402", type: "沟状遗迹" });
    expect(metricValue("记录总数")).toBe("4");
    first.unmount();

    // 模拟刷新：同一 localStorage 下重新挂载
    render(<App />);
    expect(screen.getByRole("heading", { name: /T0402/ })).toBeInTheDocument();
    expect(metricValue("记录总数")).toBe("4");
    expect(metricValue("未整理记录")).toBe("2");
    expect(storedRecords().map((record) => record.square)).toContain("T0402");
  });

  it("导出摘要：生成包含当前记录总数的文本文件", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((_blob: Blob) => "blob:mock");
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<App />);
    await user.click(screen.getByRole("button", { name: "导出摘要" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain("记录总数：3 条");
    expect(text).toContain("T0203");
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
