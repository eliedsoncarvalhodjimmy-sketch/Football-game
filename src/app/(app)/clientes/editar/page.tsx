"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/page-header";
import { Notice, Spinner } from "@/components/ui";
import { fetchClientDetail, fetchClientsBundle, updateClient } from "@/lib/clients/api";
import { clientToForm } from "@/lib/clients/model";
import { formatClientCode } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";

function EditarInner() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const load = useCallback(async () => {
    const [detail, bundle] = await Promise.all([fetchClientDetail(id), fetchClientsBundle()]);
    return { detail, bundle };
  }, [id]);
  const { data, error } = useLoader(load);

  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;
  if (!data.detail) return <Notice kind="erro">Cliente não encontrado.</Notice>;
  const { client, tagIds } = data.detail;
  const consentBy = data.bundle.team.find((p) => p.id === client.consent_by);

  return (
    <>
      <PageHeader title={`Editar ${client.code !== null ? formatClientCode(client.code) : ""} ${client.name}`} />
      <ClientForm
        initial={clientToForm(client)}
        initialTags={tagIds}
        bundle={data.bundle}
        selfId={client.id}
        referralLocked={data.detail.summary?.last_purchase_at != null && client.referred_by != null}
        consentInfo={{ at: client.consent_at, byName: consentBy ? consentBy.full_name || consentBy.email : null }}
        submitLabel="Guardar alterações"
        onSubmit={async (record, tags) => {
          await updateClient(client.id, record, tags, tagIds);
          router.replace(`/clientes/ficha?id=${client.id}`);
        }}
      />
    </>
  );
}

export default function EditarClientePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EditarInner />
    </Suspense>
  );
}
