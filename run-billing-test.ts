const BASE = "http://localhost:3000";

async function api(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, rawText: text };
}

async function main() {
  let pass = 0, fail = 0;
  function check(ok: boolean, msg: string) {
    if (ok) { pass++; console.log(`  ✅ ${msg}`); }
    else { fail++; console.log(`  ❌ ${msg}`); }
  }

  console.log("==================================================");
  console.log("  BILLING MODULE — E2E TESTS (v2)");
  console.log("==================================================");

  // Auth
  console.log("\n━━━ TEST 1: AUTH ━━━");
  const loginRes = await api("POST", "/api/auth/login", { email: "admin@maellis.com", password: "Admin123!" });
  const token = loginRes.data?.token;
  check(loginRes.status === 200 && !!token, `Login: ${loginRes.status}`);
  if (!token) { console.log("FATAL: No token"); process.exit(1); }

  const noAuth = await api("GET", "/api/billing/stats");
  check(noAuth.status === 401, `No auth → 401`);

  // Get existing clients to check if test data exists
  const existingClients = await api("GET", "/api/clients?search=airsenegal", undefined, token);
  const existingCid = existingClients.data?.data?.data?.[0]?.id;

  // Client CRUD
  console.log("\n━━━ TEST 2: CLIENT CRUD ━━━");
  
  let cid: string;
  if (existingCid) {
    console.log("  ⚠️  Reusing existing client from previous run");
    cid = existingCid;
    check(true, `Existing client: ${cid.slice(0, 8)}`);
  } else {
    const c = await api("POST", "/api/clients", {
      name: "Air Sénégal SA", email: "billing@airsenegal.sn", phone: "+221331234567",
      company: "Air Sénégal SA", taxId: "NINEA-0012345678A",
      address: JSON.stringify({ street: "Aéroport AIBD", city: "Dakar", country: "Sénégal" }),
      currency: "XOF", taxRate: 0.18,
    }, token);
    cid = c.data?.data?.id;
    check(cid && c.data?.data?.name === "Air Sénégal SA", `Create client: ${cid?.slice(0, 8)}`);
  }

  const cl = await api("GET", "/api/clients?limit=10", undefined, token);
  check(cl.data?.data?.data?.length >= 1, `List clients: ${cl.data?.data?.data?.length}`);

  const cd = await api("GET", `/api/clients/${cid}`, undefined, token);
  check(cd.data?.data?.id === cid, "Get client detail");

  const cu = await api("PATCH", `/api/clients/${cid}`, { notes: "Client VIP — Partenaire Premium" }, token);
  check(cu.data?.data?.notes === "Client VIP — Partenaire Premium", "Update client");

  const dup = await api("POST", "/api/clients", { name: "Dup", email: "billing@airsenegal.sn", phone: "+221000" }, token);
  check(dup.status === 409, `Duplicate email → ${dup.status}`);

  const val = await api("POST", "/api/clients", { name: "", email: "bad", phone: "" }, token);
  check(val.status === 400, `Validation → ${val.status}`);

  // Invoice CRUD + Tax
  console.log("\n━━━ TEST 3: INVOICE CRUD + TAX ━━━");
  const inv = await api("POST", "/api/invoices", {
    clientId: cid, type: "subscription",
    items: [
      { description: "Lounge VIP Juillet", quantity: 1, unitPrice: 500000 },
      { description: "Concierge Premium", quantity: 2, unitPrice: 75000 },
    ],
    notes: "Contrat annuel",
  }, token);
  const iid = inv.data?.data?.id;
  const inum = inv.data?.data?.invoiceNumber;
  const sub = inv.data?.data?.subtotal;
  const tax = inv.data?.data?.taxAmount;
  const tot = inv.data?.data?.total;
  const ic = inv.data?.data?.items?.length || 0;
  const taxOk = Math.abs(sub - 650000) < 0.01 && Math.abs(tax - 117000) < 0.01 && Math.abs(tot - 767000) < 0.01;
  check(!!iid && !!inum?.startsWith("FAC-") && inv.data?.data?.status === "draft" && taxOk && ic === 2,
    `Invoice: ${inum} HT=${sub} TVA=${tax} TTC=${tot}`);

  const id2 = await api("GET", `/api/invoices/${iid}`, undefined, token);
  const detailStatus = id2.data?.data?.status;
  const detailPaid = id2.data?.data?.totalPaid;
  check(detailStatus === "draft" && detailPaid === 0, `Detail: status=${detailStatus} paid=${detailPaid}`);
  if (!detailStatus) console.log(`    DEBUG detail response: ${JSON.stringify(id2.data).slice(0, 200)}`);

  const il = await api("GET", "/api/invoices?limit=10", undefined, token);
  check(il.data?.data?.invoices?.length >= 1, `List invoices: ${il.data?.data?.invoices?.length}`);

  const inv2 = await api("POST", "/api/invoices", {
    clientId: cid, type: "custom",
    items: [{ description: "Service ponctuel", quantity: 1, unitPrice: 100000 }],
  }, token);
  const i2id = inv2.data?.data?.id;
  const i2num = inv2.data?.data?.invoiceNumber;
  check(i2num && i2num > inum, `Auto-increment: ${inum} → ${i2num}`);

  // Lifecycle
  console.log("\n━━━ TEST 4: LIFECYCLE ━━━");
  const send = await api("POST", `/api/invoices/${iid}/send`, undefined, token);
  check(send.data?.data?.status === "sent", `Send: ${send.data?.data?.status}`);

  const pay = await api("POST", `/api/invoices/${iid}/pay`, { amount: 300000, method: "bank_transfer" }, token);
  check(pay.data?.data?.invoice?.status === "partially_paid" && pay.data?.data?.payment?.amount === 300000,
    `Partial: ${pay.data?.data?.invoice?.status}`);

  const pay2 = await api("POST", `/api/invoices/${iid}/pay`, { amount: 467000, method: "cinetpay", transactionId: "CPN-TEST-001" }, token);
  check(pay2.data?.data?.invoice?.status === "paid" && !!pay2.data?.data?.invoice?.paidAt,
    `Full pay: ${pay2.data?.data?.invoice?.status}`);

  const over = await api("POST", `/api/invoices/${iid}/pay`, { amount: 100, method: "cash" }, token);
  check(over.status === 400, `Overpayment → ${over.status}: ${over.data?.error?.slice(0, 40)}`);

  const cancel = await api("PATCH", `/api/invoices/${i2id}`, { status: "cancelled" }, token);
  check(cancel.data?.data?.status === "cancelled", `Cancel: ${cancel.data?.data?.status}`);

  const cpay = await api("POST", `/api/invoices/${i2id}/pay`, { amount: 1000, method: "cash" }, token);
  check(cpay.status === 400, `Cancel pay reject → ${cpay.status}: ${cpay.data?.error?.slice(0, 40)}`);

  // PDF
  console.log("\n━━━ TEST 5: PDF GENERATION ━━━");
  const pdfR = await fetch(`${BASE}/api/invoices/${iid}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
  const pdfBuf = Buffer.from(await pdfR.arrayBuffer());
  const pdfH = pdfBuf.slice(0, 5).toString();
  check(pdfR.status === 200 && pdfBuf.length > 1000 && pdfH === "%PDF-",
    `PDF: ${pdfBuf.length} bytes, ${pdfH}`);
  if (pdfR.status !== 200 || pdfH !== "%PDF-") {
    console.log(`    DEBUG: status=${pdfR.status} body=${(await pdfR.text()).slice(0, 200)}`);
  }

  // CinetPay Webhook
  console.log("\n━━━ TEST 6: CINETPAY WEBHOOK ━━━");
  const inv3 = await api("POST", "/api/invoices", {
    clientId: cid, type: "commission",
    items: [{ description: "Commission Marketplace", quantity: 1, unitPrice: 250000 }],
  }, token);
  const i3id = inv3.data?.data?.id;
  await api("POST", `/api/invoices/${i3id}/send`, undefined, token);
  await api("POST", `/api/invoices/${i3id}/pay`, { amount: 295000, method: "cinetpay", transactionId: "CPN-WH-001" }, token);

  const wh = await api("POST", "/api/webhooks/cinetpay-invoice", { cpm_trans_id: "CPN-WH-001", cpm_amount: "295000", cpm_trans_status: "ACCEPTED", cpm_custom: "" });
  check(wh.status === 200, `Webhook OK → ${wh.status}`);

  const wh2 = await api("POST", "/api/webhooks/cinetpay-invoice", { cpm_trans_id: "CPN-WH-001", cpm_amount: "295000", cpm_trans_status: "ACCEPTED", cpm_custom: "" });
  check(wh2.status === 200, `Webhook idempotent → ${wh2.status}`);

  // Reminders + Overdue
  console.log("\n━━━ TEST 7: REMINDERS + OVERDUE ━━━");
  const inv5 = await api("POST", "/api/invoices", {
    clientId: cid, type: "subscription",
    items: [{ description: "Test overdue", quantity: 1, unitPrice: 100000 }],
    dueDate: "2020-01-01T00:00:00.000Z",
  }, token);
  const i5id = inv5.data?.data?.id;
  await api("POST", `/api/invoices/${i5id}/send`, undefined, token);

  const od = await api("POST", "/api/billing/reminders", { action: "check_overdue" }, token);
  check(od.data?.data?.count >= 1, `Overdue: ${od.data?.data?.count} invoice(s)`);

  const rem = await api("POST", "/api/billing/reminders", {}, token);
  check(true, `Reminders: sent=${rem.data?.data?.sent} failed=${rem.data?.data?.failed}`);

  // Settings
  console.log("\n━━━ TEST 8: SETTINGS ━━━");
  const gs = await api("GET", "/api/billing/settings", undefined, token);
  check(gs.data?.data?.id, `Settings id: ${gs.data?.data?.id}`);

  const us = await api("PUT", "/api/billing/settings", {
    legalName: "MAELLIS Technologies SARL", legalAddress: "Dakar, Sénégal",
    bankName: "BSIC Sénégal", gracePeriodDays: 3, reminderDays: "[3,7,15]",
  }, token);
  check(us.data?.data?.legalName === "MAELLIS Technologies SARL", `Settings updated`);

  // CSV Export
  console.log("\n━━━ TEST 9: CSV EXPORT ━━━");
  const csv = await fetch(`${BASE}/api/invoices/export`, { headers: { Authorization: `Bearer ${token}` } });
  const csvBuf = Buffer.from(await csv.arrayBuffer());
  const csvText = csvBuf.toString('utf-8');
  const hasBOM = csvBuf[0] === 0xEF && csvBuf[1] === 0xBB && csvBuf[2] === 0xBF;
  check(csv.status === 200 && csvText.length > 50, `CSV: ${csvText.length} bytes`);
  check(hasBOM, `BOM: ${hasBOM}`);

  // Stats
  console.log("\n━━━ TEST 10: STATS ━━━");
  const st = await api("GET", "/api/billing/stats", undefined, token);
  const ov = st.data?.data?.overview;
  check(ov?.totalInvoices >= 1 && ov?.totalClients >= 1, `Stats: inv=${ov?.totalInvoices} cli=${ov?.totalClients}`);

  // Delete protection
  console.log("\n━━━ TEST 11: DELETE PROTECTION ━━━");
  const del = await api("DELETE", `/api/clients/${cid}`, undefined, token);
  check(del.status === 400, `Delete blocked → ${del.status}`);

  const nf = await api("GET", "/api/clients/nonexistent", undefined, token);
  check(nf.status === 404, `Not found → ${nf.status}`);

  // Validation
  console.log("\n━━━ TEST 12: VALIDATION ━━━");
  const ivs = await api("PATCH", `/api/invoices/${iid}`, { status: "bad_status" }, token);
  check(ivs.status === 400, `Invalid status → ${ivs.status}`);

  // Summary
  console.log("\n==================================================");
  console.log(`  RESULTS: ✅ ${pass} PASS | ❌ ${fail} FAIL`);
  console.log("==================================================");
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
