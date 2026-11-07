"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CeoOnly } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { Notice, Spinner } from "@/components/ui";
import { fetchProducts } from "@/lib/products/api";
import { emptyProductForm } from "@/lib/products/form-mapping";
import { useLoader } from "@/lib/use-loader";

function Inner() {
  const router = useRouter();
  const load = useCallback(() => fetchProducts(true), []);
  const { data, error } = useLoader(load);
  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;
  return (
    <>
      <PageHeader title="Novo produto" />
      <ProductForm
        productId={null}
        initial={emptyProductForm()}
        otherSkus={data.flatMap((p) => p.variants.map((v) => v.sku))}
        onSaved={(id) => router.replace(`/produtos/ficha?id=${id}&novo=1`)}
      />
    </>
  );
}

export default function NovoProdutoPage() {
  return (
    <CeoOnly>
      <Inner />
    </CeoOnly>
  );
}
