import Container from "./Container";
import { ReturnIcon, ShieldIcon, TruckIcon } from "./Icons";
import { getSettings } from "@/lib/settings";

/** Tri kratke poruke povjerenja ispod heroa. Tekstovi se mijenjaju u CMS-u. */
export default async function TrustStrip() {
  const { shop } = await getSettings();

  const items = [
    { icon: <TruckIcon />, text: shop.deliveryNote },
    { icon: <ShieldIcon />, text: shop.warrantyNote },
    { icon: <ReturnIcon />, text: shop.returnNote },
  ].filter((i) => i.text);

  if (items.length === 0) return null;

  return (
    <section className="border-b border-line bg-surface">
      <Container>
        <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-3 px-4 py-6 text-center"
            >
              <span className="text-brand">{item.icon}</span>
              <span className="text-sm text-ink-2">{item.text}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
