let liffId = "2006477066-AvryED4B";

async function init() {
  await liff.init({ liffId });
  loadExcel();
}

function loadExcel() {
  fetch("promos.xlsx")
    .then(res => res.arrayBuffer())
    .then(ab => {
      const workbook = XLSX.read(ab, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      renderCards(data);
      setupFilter(data);
    });
}

function renderCards(data) {
  const container = document.getElementById("promoContainer");
  container.innerHTML = "";
  data.forEach(row => {
    const card = document.createElement("div");
    card.className = "promo-card";
    card.innerHTML = `
      <div class="ribbon">${row["หัวcard"]}</div>
      <div class="card-body">
        <div class="main-promo">
          <div class="speed-main">${row["ความเร็ว"]}</div>
        </div>
        <div class="details">
          <div>${row["ประเภทโปรโมชั่น"]}</div>
          <div>${row["ราคา/ระยะเวลา"]}</div>
          <div>${row["โบนัส"]}</div>
        </div>
      </div>
      <div class="card-footer" onclick="callNow('${row["รหัสสมัคร"]}')">
        📞 กดสมัครเลย
      </div>
    `;
    container.appendChild(card);
  });
}

function setupFilter(data) {
  document.getElementById("categoryFilter").addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "ทั้งหมด") renderCards(data);
    else renderCards(data.filter(d => d["หมวดหมู่"] === val));
  });
}

function callNow(code) {
  const phoneLink = `tel:${code}`;
  window.location.href = phoneLink;
}

init();
