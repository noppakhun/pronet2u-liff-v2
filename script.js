// ---------- CONFIG ----------
const LIFF_ID = "2006477066-AvryED4B"; // ใช้ LIFF ID ของคุณ
const EXCEL_FILE = "promos.xlsx";      // ชื่อไฟล์ Excel (วางในโฟลเดอร์เดียวกัน)
// -----------------------------

// small helper: wait until XLSX lib available
function waitForXLSX(timeout = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (window.XLSX) return resolve();
      if (Date.now() - start > timeout) return reject(new Error("XLSX not loaded"));
      setTimeout(check, 50);
    })();
  });
}

// encode USSD for URL (# -> %23)
function encodeUSSD(code) {
  if (!code) return "";
  return code.replace(/#/g, "%23");
}

// initialize LIFF (best effort; if fails continue)
async function initLiff() {
  try {
    if (window.liff && LIFF_ID) {
      await liff.init({ liffId: LIFF_ID });
      console.log("LIFF initialized");
    } else {
      console.warn("LIFF SDK not available or missing LIFF_ID");
    }
  } catch (err) {
    console.warn("LIFF init error:", err);
  }
}

// fetch and parse excel into JSON rows
async function loadExcelRows() {
  await waitForXLSX().catch(err => { console.error(err); });
  const resp = await fetch(EXCEL_FILE, { cache: "no-store" });
  if (!resp.ok) throw new Error("ไม่พบไฟล์ " + EXCEL_FILE + " (HTTP " + resp.status + ")");
  const ab = await resp.arrayBuffer();
  const workbook = XLSX.read(ab, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows;
}

// render cards from rows
function renderCards(rows) {
  const container = document.getElementById("cards");
  const msg = document.getElementById("message");
  container.innerHTML = "";
  if (!rows || rows.length === 0) {
    msg.textContent = "ไม่มีโปรโมชั่นให้แสดง (ตรวจสอบ promos.xlsx)";
    return;
  } else {
    msg.textContent = "";
  }

  rows.forEach(row => {
    // sanitized values (use column names exactly as in Excel)
    const category = row["หมวดหมู่"] || "";
    const title = row["หัวcard"] || row["ประเภทโปรโมชั่น"] || "โปร";
    const promoType = row["ประเภทโปรโมชั่น"] || "";
    const speed = row["ความเร็ว"] || "";
    const priceDuration = row["ราคา/ระยะเวลา"] || ( (row["ราคา"]||"") + " / " + (row["ระยะเวลา"]||"") );
    const bonus = row["โบนัส"] || "";
    const code = row["รหัสสมัคร"] || "";

    const card = document.createElement("article");
    card.className = "promo-card";
    card.dataset.cat = category;

    card.innerHTML = `
      <div class="ribbon">${escapeHtml(title)}</div>
      <div class="card-body">
        <div class="main-left">
          <div class="speed">${escapeHtml(speed)}</div>
        </div>
        <div class="details">
          <div class="type">${escapeHtml(promoType)}</div>
          <div class="price">${escapeHtml(priceDuration)}</div>
          <div class="bonus">${escapeHtml(bonus)}</div>
        </div>
      </div>
      <div class="card-footer">
        <button class="call-btn" data-code="${escapeAttr(code)}">📞 สมัครเลย</button>
        <button class="copy-btn" data-code="${escapeAttr(code)}">คัดลอกโค้ด</button>
      </div>
    `;

    container.appendChild(card);
  });

  attachCardEvents();
}

// attach events for call + copy
function attachCardEvents() {
  document.querySelectorAll(".call-btn").forEach(btn => {
    btn.onclick = async (e) => {
      const raw = btn.getAttribute("data-code") || "";
      if (!raw) { alert("ไม่พบรหัสสมัคร"); return; }

      // Prefer liff.openWindow external to force external browser on iOS
      const encoded = encodeUSSD(raw);
      try {
        if (window.liff && liff.openWindow) {
          await liff.openWindow({ url: "tel:" + encoded, external: true });
          return;
        }
      } catch (err) {
        console.warn("liff.openWindow failed, fallback to location:", err);
      }
      // fallback
      window.location.href = "tel:" + raw;
    };
  });

  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.onclick = (e) => {
      const code = btn.getAttribute("data-code") || "";
      if (!code) { alert("ไม่พบรหัสสมัคร"); return; }
      navigator.clipboard.writeText(code).then(() => {
        alert("คัดลอกโค้ด: " + code);
      }).catch(() => {
        alert("คัดลอกไม่ได้ — โปรดคัดลอกด้วยมือ: " + code);
      });
    };
  });
}

// filter functionality (buttons)
function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      const cat = this.dataset.cat;
      const cards = document.querySelectorAll(".promo-card");
      cards.forEach(card => {
        if (cat === "all") {
          card.style.display = "";
        } else {
          card.style.display = (card.dataset.cat === cat) ? "" : "none";
        }
      });
    });
  });
}

// utility: escape HTML (very small sanitizer)
function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(s) {
  if (!s) return "";
  return String(s).replaceAll('"', '&quot;');
}

// main boot
(async function main() {
  try {
    document.getElementById("message").textContent = "กำลังเชื่อม LIFF และโหลดข้อมูล...";
    await initLiff();
    const rows = await loadExcelRows();
    renderCards(rows);
    initFilters();
    document.getElementById("message").textContent = "";
  } catch (err) {
    console.error(err);
    document.getElementById("message").textContent = "เกิดข้อผิดพลาด: " + (err.message || err);
  }
})();
