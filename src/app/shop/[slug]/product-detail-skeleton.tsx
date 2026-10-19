import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";

export function ProductDetailSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-cream, #f7f4ee)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader solidBackground />

      <main
        style={{
          flex: 1,
          maxWidth: "1320px",
          margin: "0 auto",
          width: "100%",
          padding: "24px 20px 80px",
        }}
      >
        {/* Breadcrumb Skeleton */}
        <div
          style={{
            width: "220px",
            height: "14px",
            backgroundColor: "#e8dfd5",
            borderRadius: "6px",
            marginBottom: "28px",
            opacity: 0.6,
          }}
        />

        {/* Main Grid Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
            gap: "52px",
            alignItems: "start",
          }}
        >
          {/* Gallery Skeleton */}
          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "90px" }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 4",
                    borderRadius: "10px",
                    backgroundColor: "#e8dfd5",
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                flex: 1,
                aspectRatio: "3 / 4",
                borderRadius: "20px",
                backgroundColor: "#e8dfd5",
                opacity: 0.6,
              }}
            />
          </div>

          {/* Details Skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                width: "70%",
                height: "36px",
                backgroundColor: "#e8dfd5",
                borderRadius: "8px",
                opacity: 0.7,
              }}
            />
            <div
              style={{
                width: "40%",
                height: "20px",
                backgroundColor: "#e8dfd5",
                borderRadius: "6px",
                opacity: 0.5,
              }}
            />
            <div
              style={{
                width: "30%",
                height: "32px",
                backgroundColor: "#e8dfd5",
                borderRadius: "8px",
                opacity: 0.7,
                marginTop: "8px",
              }}
            />
            <div
              style={{
                width: "100%",
                height: "80px",
                backgroundColor: "#e8dfd5",
                borderRadius: "8px",
                opacity: 0.4,
              }}
            />
            <div
              style={{
                width: "100%",
                height: "56px",
                backgroundColor: "#e8dfd5",
                borderRadius: "9999px",
                opacity: 0.5,
                marginTop: "16px",
              }}
            />
          </div>
        </div>
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
