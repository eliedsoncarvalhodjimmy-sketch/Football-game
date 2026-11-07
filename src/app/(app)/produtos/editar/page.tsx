"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { CeoOnly } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { Notice, Spinner } from "@/components/ui";
import { fetchProducts } from "@/lib/products/api";
import { productToForm } from "@/lib/products/form-mapping";
import { useLoader } from "@/lib/use-loader";

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const load = useCallback(() => fetchProducts(true), []);
  const { data, error } = useLoader(load);
  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;
  const product = data.find((p) => p.id === id);
  if (!product) return <Notice kind="erro">Produto não encontrado.</Notice>;
  return (
    <>
      <PageHeader title={`Editar ${product.name}`} subtitle="As variações não se apagam (por causa do histórico de vendas): desactive-as." />
      <ProductForm
        productId={product.id}
        initial={productToForm(product)}
        otherSkus={data.filter((p) => p.id !== id).flatMap((p) => p.variants.map((v) => v.sku))}
        onSaved={(pid) => router.replace(`/produtos/ficha?id=${pid}`)}
      />
    </>
  );
}

export default function EditarProdutoPage() {
  return (
    <CeoOnly>
      <Suspense fallback={<Spinner />}>
        <Inner />
      </Suspense>
    </CeoOnly>
  );
}
