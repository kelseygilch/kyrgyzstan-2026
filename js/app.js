/* ====== Kyrgyzstan 2026 Trip Planner — app logic ====== */
(function () {
  "use strict";

  const STORAGE_KEY = "kyrgyzstan-2026-trip-planner";
  const PEOPLE = SEED.people;
  const GROUPS = SEED.groups;

  // ---- State -------------------------------------------------------------
  let state = load();
  let activeTab = "itinerary";
  let activeGroup = "TK";
  let activePerson = PEOPLE[0];

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { console.warn("Could not read saved data:", e); }
    return freshState();
  }

  function freshState() {
    return {
      itinerary: deepClone(SEED.itinerary), // { TK:[...], TL:[] }
      personal: deepClone(SEED.personal),   // { person: [items] }
      shared: deepClone(SEED.shared),       // [ {qty, carriers[], packed[]} ]
      meals: deepClone(SEED.meals),         // [ {day,date,route, breakfast/lunch/dinner:{desc,qty}} ]
      ui: { collapsed: {} },                // collapsed packing categories, keyed "section:Category"
    };
  }

  // Ensure older saved blobs gain any newly added fields.
  function migrate(s) {
    const base = freshState();
    if (!s.itinerary) s.itinerary = base.itinerary;
    if (!s.itinerary.TL) s.itinerary.TL = [];
    if (!s.personal) s.personal = base.personal;
    if (!s.shared) s.shared = base.shared;
    if (!s.meals) s.meals = base.meals;
    if (!s.ui) s.ui = base.ui;
    if (!s.ui.collapsed) s.ui.collapsed = {};
    return s;
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { toast("⚠ Could not save — storage may be full"); }
  }

  // ---- Small helpers -----------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    for (const k in props) {
      if (k === "class") n.className = props[k];
      else if (k === "html") n.innerHTML = props[k];
      else if (k === "text") n.textContent = props[k];
      else if (k.startsWith("on") && typeof props[k] === "function") n.addEventListener(k.slice(2), props[k]);
      else if (props[k] === true) n.setAttribute(k, "");
      else if (props[k] !== false && props[k] != null) n.setAttribute(k, props[k]);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function uid(p) { return p + "-" + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ====================================================================
  //  ITINERARY
  // ====================================================================
  function dayKind(d) {
    const a = (d.activity || "").toLowerCase();
    if (a.includes("trek")) return "trek";
    if (a.includes("fly") || a.includes("travel") || a.includes("depart") ||
        a.includes("arrive") || a.includes("taxi") || a.includes(">") || a.includes("drive")) return "travel";
    return "";
  }

  function renderGroupSwitch() {
    const wrap = $("#group-switch");
    wrap.innerHTML = "";
    Object.keys(GROUPS).forEach(g => {
      wrap.appendChild(el("button", {
        class: "switch-btn" + (g === activeGroup ? " is-active" : ""),
        onclick: () => { activeGroup = g; renderItinerary(); },
        text: GROUPS[g],
      }));
    });
  }

  function renderItinerary() {
    renderGroupSwitch();
    const list = $("#itinerary-list");
    list.innerHTML = "";
    const days = state.itinerary[activeGroup] || [];

    // Toolbar bits
    const copyBtn = $("#btn-copy-across");
    copyBtn.hidden = activeGroup !== "TL";
    $("#itin-meta").textContent = days.length ? `${days.length} days` : "";

    if (!days.length) {
      list.appendChild(el("div", { class: "empty-state" }, [
        el("h3", { text: GROUPS[activeGroup] + " — no itinerary yet" }),
        el("p", { class: "muted", text: activeGroup === "TL"
          ? "Use “Copy Trevor & Kelsey's plan across” to start from their itinerary, then edit the differences. Or add days manually."
          : "Add a day to begin." }),
      ]));
      return;
    }

    days.forEach((d, idx) => list.appendChild(renderDayCard(d, idx)));
  }

  function renderDayCard(d, idx) {
    const kind = dayKind(d);
    const card = el("div", { class: "day-card" + (kind ? " is-" + kind : ""), "data-idx": idx });

    const chips = [];
    if (d.hikeDist && d.hikeDist !== "—") chips.push(el("span", { class: "chip", text: "🥾 " + d.hikeDist + (d.hikeTime && d.hikeTime !== "—" ? " · " + d.hikeTime : "") }));
    if (d.elevation) chips.push(el("span", { class: "chip warn", text: "⛰ " + d.elevation }));
    if (d.driveDist && d.driveDist !== "—") chips.push(el("span", { class: "chip sky", text: "🚗 " + d.driveDist + (d.driveTime && d.driveTime !== "—" ? " · " + d.driveTime : "") }));
    if (d.accommodation) chips.push(el("span", { class: "chip", text: "🛏 " + firstLine(d.accommodation) }));

    const top = el("div", { class: "day-top", onclick: (e) => {
      if (e.target.closest("input,textarea,button,select")) return;
      card.classList.toggle("open");
    } }, [
      el("div", { class: "day-badge" }, [
        el("span", { class: "day-num", text: d.day }),
        el("span", { class: "day-dow", text: d.dow || "" }),
        el("span", { class: "day-date", text: fmtDate(d.date) }),
      ]),
      el("div", {}, [
        el("div", { class: "day-activity", text: d.activity || "—" }),
        chips.length ? el("div", { class: "day-chips" }, chips) : null,
      ]),
      el("span", { class: "expand-ico", text: "›" }),
    ]);

    const detail = el("div", { class: "day-detail" }, [
      el("div", { class: "detail-grid" }, [
        field("Day", d, "day", false),
        field("Day of week", d, "dow", false),
        field("Date (YYYY-MM-DD)", d, "date", false),
        field("Activity", d, "activity", true),
        field("Notes", d, "notes", true, "full"),
        field("Hiking distance", d, "hikeDist", false),
        field("Hiking time", d, "hikeTime", false),
        field("Elevation", d, "elevation", false),
        field("Driving distance", d, "driveDist", false),
        field("Driving time", d, "driveTime", false),
        field("Accommodation", d, "accommodation", true),
        field("Food", d, "food", true),
      ]),
      el("div", { class: "day-detail-actions" }, [
        el("button", { class: "btn btn-danger btn-xs", text: "Delete day", onclick: () => {
          if (confirm(`Delete ${d.day}?`)) { state.itinerary[activeGroup].splice(idx, 1); save(); renderItinerary(); }
        } }),
      ]),
    ]);

    card.appendChild(top);
    card.appendChild(detail);
    return card;
  }

  function field(label, obj, key, multiline, extraClass) {
    const cls = "field" + (extraClass ? " " + extraClass : "");
    const input = multiline
      ? el("textarea", { value: "" })
      : el("input", { type: "text" });
    input.value = obj[key] || "";
    input.addEventListener("input", () => {
      obj[key] = input.value;
      save();
      // live-refresh the collapsed header for fields shown in the badge/chips
      if (["day", "dow", "date", "activity", "hikeDist", "hikeTime", "elevation", "driveDist", "driveTime", "accommodation"].includes(key)) {
        scheduleHeaderRefresh();
      }
    });
    return el("div", { class: cls }, [el("label", { text: label }), input]);
  }

  // Debounced re-render so the collapsed card header reflects edits without losing focus mid-typing.
  let headerTimer;
  function scheduleHeaderRefresh() {
    clearTimeout(headerTimer);
    headerTimer = setTimeout(() => {
      const openIdxs = $$(".day-card.open").map(c => c.getAttribute("data-idx"));
      renderItinerary();
      openIdxs.forEach(i => { const c = $(`.day-card[data-idx="${i}"]`); if (c) c.classList.add("open"); });
    }, 600);
  }

  function firstLine(s) { return (s || "").split("\n")[0]; }
  function fmtDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  }

  // ====================================================================
  //  PACKING
  // ====================================================================
  function renderPersonSwitch() {
    const wrap = $("#person-switch");
    wrap.innerHTML = "";
    PEOPLE.forEach(p => {
      wrap.appendChild(el("button", {
        class: "switch-btn" + (p === activePerson ? " is-active" : ""),
        onclick: () => { activePerson = p; renderPacking(); },
        text: p,
      }));
    });
  }

  function renderPacking() {
    renderPersonSwitch();
    renderPersonalList();
    renderSharedList();
  }

  function groupByCategory(items) {
    const map = new Map();
    items.forEach((it, i) => {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category).push({ it, i });
    });
    return map;
  }

  // Build a collapsible category panel. `section` namespaces the collapsed state
  // so the same category name in personal vs shared collapses independently.
  function categoryPanel(section, cat, countText, bodyChildren) {
    const key = section + ":" + cat;
    const collapsed = !!state.ui.collapsed[key];
    const panel = el("div", { class: "pack-cat" + (collapsed ? " collapsed" : "") });
    const head = el("h3", {}, [
      el("span", { class: "cat-ico", text: "▾" }),
      el("span", { text: cat }),
      countText ? el("span", { class: "cat-count", text: countText }) : null,
    ]);
    head.addEventListener("click", () => {
      const now = !panel.classList.contains("collapsed");
      panel.classList.toggle("collapsed", now);
      state.ui.collapsed[key] = now;
      save();
    });
    const body = el("div", { class: "cat-body" }, bodyChildren);
    panel.appendChild(head);
    panel.appendChild(body);
    return panel;
  }

  function renderPersonalList() {
    const root = $("#packing-personal");
    root.innerHTML = "";
    const items = state.personal[activePerson];

    const packed = items.filter(i => i.packed).length;
    $("#pack-meta").innerHTML =
      `${activePerson}: ${packed}/${items.length} packed ` +
      `<span class="progress"><span style="width:${items.length ? Math.round(packed / items.length * 100) : 0}%"></span></span>`;

    const byCat = groupByCategory(items);
    byCat.forEach((entries, cat) => {
      const packedN = entries.filter(e => e.it.packed).length;
      const body = entries.map(({ it, i }) => personalRow(it, i));
      body.push(el("div", { class: "cat-add" }, [
        el("button", { class: "btn btn-xs", text: "+ Add item", onclick: () => {
          items.push({ id: uid(activePerson), category: cat, name: "New item", qty: 1, packed: false });
          save(); renderPersonalList();
        } }),
      ]));
      root.appendChild(categoryPanel("personal", cat, `${packedN}/${entries.length}`, body));
    });
  }

  function personalRow(it, i) {
    const row = el("div", { class: "pack-row" + (it.packed ? " packed" : "") });

    const check = el("input", { type: "checkbox", class: "checkbox" });
    check.checked = !!it.packed;
    check.addEventListener("change", () => { it.packed = check.checked; save(); row.classList.toggle("packed", it.packed); updatePersonMeta(); });

    const name = el("input", { class: "pack-name", type: "text", value: it.name });
    name.addEventListener("input", () => { it.name = name.value; save(); });

    const qty = el("input", { class: "qty-input", type: "text", value: it.qty });
    qty.addEventListener("input", () => { it.qty = qty.value; save(); });

    const promote = el("button", {
      class: "btn btn-xs", title: "Move to shared gear (carried once for the whole group)",
      text: "→ Shared", onclick: () => {
        state.shared.push({ id: uid("sh"), category: it.category, name: it.name, qty: 1, carriers: [null], packed: [false] });
        state.personal[activePerson].splice(i, 1);
        save(); renderPacking();
        toast(`Moved “${it.name}” to shared gear`);
      }
    });
    const del = el("button", { class: "btn btn-danger btn-xs", text: "✕", title: "Remove", onclick: () => {
      state.personal[activePerson].splice(i, 1); save(); renderPersonalList();
    } });

    row.appendChild(check);
    row.appendChild(name);
    row.appendChild(qty);
    row.appendChild(el("div", { class: "row-actions" }, [promote, del]));
    return row;
  }

  function updatePersonMeta() {
    const items = state.personal[activePerson];
    const packed = items.filter(i => i.packed).length;
    $("#pack-meta").innerHTML =
      `${activePerson}: ${packed}/${items.length} packed ` +
      `<span class="progress"><span style="width:${items.length ? Math.round(packed / items.length * 100) : 0}%"></span></span>`;
  }

  function renderSharedList() {
    const root = $("#packing-shared");
    root.innerHTML = "";
    const byCat = groupByCategory(state.shared);

    byCat.forEach((entries, cat) => {
      const body = entries.map(({ it, i }) => sharedItem(it, i));
      root.appendChild(categoryPanel("shared", cat, `${entries.length} item${entries.length === 1 ? "" : "s"}`, body));
    });

    // global add
    root.appendChild(el("div", { class: "cat-add" }, [
      el("button", { class: "btn", text: "+ Add shared item", onclick: () => {
        state.shared.push({ id: uid("sh"), category: "Misc", name: "New shared item", qty: 1, carriers: [null], packed: [false] });
        save(); renderSharedList();
      } }),
    ]));
  }

  function resizeShared(it, n) {
    n = Math.max(1, n);
    while (it.carriers.length < n) { it.carriers.push(null); it.packed.push(false); }
    if (it.carriers.length > n) { it.carriers.length = n; it.packed.length = n; }
    it.qty = n;
  }

  function sharedItem(it, idx) {
    const wrap = el("div", { class: "shared-item" });

    const name = el("input", { class: "shared-name", type: "text", value: it.name });
    name.addEventListener("input", () => { it.name = name.value; save(); });

    // qty stepper
    const countSpan = el("span", { text: String(it.qty) });
    const stepper = el("div", { class: "qty-stepper" }, [
      el("button", { text: "−", title: "Need fewer", onclick: () => { resizeShared(it, it.qty - 1); save(); renderSharedList(); } }),
      countSpan,
      el("button", { text: "+", title: "Need more", onclick: () => { resizeShared(it, it.qty + 1); save(); renderSharedList(); } }),
    ]);

    const del = el("button", { class: "btn btn-danger btn-xs", text: "✕", title: "Remove", onclick: () => {
      state.shared.splice(idx, 1); save(); renderSharedList();
    } });

    const top = el("div", { class: "shared-top" }, [name, stepper, del]);

    // per-unit carrier assignment
    const carriers = el("div", { class: "carriers" });
    for (let u = 0; u < it.qty; u++) {
      const unit = el("div", { class: "carrier-unit" + (it.packed[u] ? " done" : "") });

      const chk = el("input", { type: "checkbox", class: "checkbox" });
      chk.checked = !!it.packed[u];
      chk.addEventListener("change", () => { it.packed[u] = chk.checked; save(); unit.classList.toggle("done", chk.checked); });

      const label = el("span", { class: "unit-label", text: it.qty > 1 ? "#" + (u + 1) : "Carrier" });

      const sel = el("select", {});
      sel.appendChild(el("option", { value: "", text: "— who carries? —" }));
      PEOPLE.forEach(p => {
        const o = el("option", { value: p, text: p });
        if (it.carriers[u] === p) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", () => { it.carriers[u] = sel.value || null; save(); });

      unit.appendChild(chk);
      unit.appendChild(label);
      unit.appendChild(sel);
      carriers.appendChild(unit);
    }

    wrap.appendChild(top);
    wrap.appendChild(carriers);
    return wrap;
  }

  // ====================================================================
  //  FOOD — 9 trek-day meal planner with summing totals
  // ====================================================================
  const MEALS = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"]];

  function renderFood() {
    const table = $("#food-table");
    table.innerHTML = "";

    // header
    const thead = el("thead", {}, [
      el("tr", {}, [
        el("th", { text: "Day" }),
        ...MEALS.map(([, label]) => el("th", { class: "meal-col", text: label })),
        el("th", { text: "Day total" }),
      ]),
    ]);

    const colTotals = { breakfast: 0, lunch: 0, dinner: 0 };
    let grand = 0;

    const tbody = el("tbody", {});
    state.meals.forEach((row, idx) => {
      let dayTotal = 0;
      const tds = [
        el("td", { class: "food-day" }, [
          el("div", { class: "fd-num", text: row.day }),
          el("div", { class: "fd-date", text: fmtDate(row.date) }),
          row.route ? el("div", { class: "fd-route", text: row.route }) : null,
        ]),
      ];
      MEALS.forEach(([key]) => {
        const meal = row[key];
        const n = Number(meal.qty) || 0;
        colTotals[key] += n; dayTotal += n;

        const desc = el("textarea", { rows: 2 });
        desc.value = meal.desc || "";
        desc.placeholder = "—";
        desc.addEventListener("input", () => { meal.desc = desc.value; save(); });

        const qty = el("input", { type: "number", min: "0", step: "1" });
        qty.value = meal.qty;
        qty.addEventListener("input", () => { meal.qty = qty.value; save(); refreshFoodTotals(); });

        tds.push(el("td", { class: "meal-cell" }, [
          desc,
          el("div", { class: "meal-qty" }, [ el("label", { text: "Servings" }), qty ]),
        ]));
      });
      grand += dayTotal;
      tds.push(el("td", { class: "col-total", "data-daytotal": idx, text: String(dayTotal) }));
      tbody.appendChild(el("tr", {}, tds));
    });

    const tfoot = el("tfoot", {}, [
      el("tr", {}, [
        el("td", { text: "Totals (servings)" }),
        ...MEALS.map(([key]) => el("td", { id: "tot-" + key, text: String(colTotals[key]) })),
        el("td", { class: "grand", id: "tot-grand", text: String(grand) }),
      ]),
    ]);

    table.appendChild(thead);
    table.appendChild(tbody);
    table.appendChild(tfoot);
    $("#food-meta").textContent = `${state.meals.length} trek days · ${grand} total servings planned`;
  }

  // Recompute totals in place (no full re-render) so focus stays in the input.
  function refreshFoodTotals() {
    const colTotals = { breakfast: 0, lunch: 0, dinner: 0 };
    let grand = 0;
    const rows = $$("#food-table tbody tr");
    state.meals.forEach((row, idx) => {
      let dayTotal = 0;
      MEALS.forEach(([key]) => { const n = Number(row[key].qty) || 0; colTotals[key] += n; dayTotal += n; });
      grand += dayTotal;
      const cell = $(`#food-table .col-total[data-daytotal="${idx}"]`);
      if (cell) cell.textContent = String(dayTotal);
    });
    MEALS.forEach(([key]) => { const c = $("#tot-" + key); if (c) c.textContent = String(colTotals[key]); });
    const g = $("#tot-grand"); if (g) g.textContent = String(grand);
    $("#food-meta").textContent = `${state.meals.length} trek days · ${grand} total servings planned`;
  }

  // ====================================================================
  //  Tabs + header actions
  // ====================================================================
  function setTab(tab) {
    activeTab = tab;
    $$(".tab").forEach(t => t.classList.toggle("is-active", t.dataset.tab === tab));
    $$(".view").forEach(v => v.classList.toggle("is-active", v.id === "view-" + tab));
    if (tab === "itinerary") renderItinerary();
    else if (tab === "food") renderFood();
    else renderPacking();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: "kyrgyzstan-2026-trip.json" });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Exported trip data");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = migrate(data);
        save(); setTab(activeTab);
        toast("Imported trip data");
      } catch (e) { toast("⚠ That file isn't valid trip JSON"); }
    };
    reader.readAsText(file);
  }

  // ====================================================================
  //  Wire up
  // ====================================================================
  function init() {
    $("#tabs").addEventListener("click", e => {
      const btn = e.target.closest(".tab"); if (btn) setTab(btn.dataset.tab);
    });

    $("#btn-add-day").addEventListener("click", () => {
      const days = state.itinerary[activeGroup];
      days.push({ day: "Day " + (days.length + 1), dow: "", date: "", activity: "New day",
        notes: "", hikeDist: "", hikeTime: "", elevation: "", driveDist: "", driveTime: "",
        accommodation: "", food: "" });
      save(); renderItinerary();
      const last = $$(".day-card").pop(); if (last) last.classList.add("open");
    });

    $("#btn-copy-across").addEventListener("click", () => {
      const tl = state.itinerary.TL;
      if (tl.length && !confirm("This will replace Todd & Luci's current itinerary with a copy of Trevor & Kelsey's. Continue?")) return;
      state.itinerary.TL = deepClone(state.itinerary.TK);
      save(); renderItinerary();
      toast("Copied Trevor & Kelsey's plan to Todd & Luci");
    });

    $("#btn-export").addEventListener("click", exportData);
    $("#btn-import").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ""; });

    $("#btn-reset").addEventListener("click", () => {
      if (confirm("Reset ALL data back to the spreadsheet defaults? Your edits will be lost (export first if unsure).")) {
        state = freshState(); save(); setTab(activeTab); toast("Reset to defaults");
      }
    });

    setTab("itinerary");
  }

  init();
})();
