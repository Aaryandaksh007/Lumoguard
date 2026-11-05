// Reset the demo assets to their pre-take states for a clean recorded run.
import { db } from "@/lib/db";

async function main() {
  // 1. Product Launch packet → back in the Brand Manager review queue.
  //    (Do this FIRST so the Aurelia update below leaves Aurelia with the
  //    newest updatedAt — the assets list is ordered by recency and the
  //    studio combobox defaults to the first asset.)
  const packet = await db.asset.findFirst({ where: { title: "Product Launch Campaign Packet — Press Release" } });
  if (packet) {
    await db.asset.update({
      where: { id: packet.id },
      data: { status: "IN_REVIEW", assigneeRole: "BRAND_MANAGER" },
    });
    console.log(`Packet: status → IN_REVIEW (BRAND_MANAGER)`);
  }

  // 2. Aurelia → never-audited draft (and newest in the list)
  const aurelia = await db.asset.findFirst({ where: { title: "Aurelia Black — Spring Rewards Email" } });
  if (!aurelia) throw new Error("Aurelia asset not found");
  const res = await db.auditRun.deleteMany({ where: { assetId: aurelia.id } });
  await db.asset.update({ where: { id: aurelia.id }, data: { status: "DRAFT" } });
  console.log(`Aurelia: deleted ${res.count} runs; status → DRAFT (first in list)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
