import { Suspense } from "react";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Mascot } from "@/components/mascot/mascot";
import { CardEffects } from "@/components/shop/card-effects";
import { WhatsAppFloat } from "@/components/support/whatsapp-float";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AnnouncementBar />
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <WhatsAppFloat />
      {/* Lee la dirección: va en Suspense para no frenar el resto de la página. */}
      <Suspense fallback={null}>
        <Mascot />
      </Suspense>
      <CardEffects />
    </>
  );
}
