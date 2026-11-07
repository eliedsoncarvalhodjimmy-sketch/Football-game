"use client";

import { useRouter } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/page-header";
import { Notice, Spinner } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { createClient, fetchClientsBundle } from "@/lib/clients/api";
import { emptyClientForm } from "@/lib/clients/model";
import { useLoader } from "@/lib/use-loader";

export default function NovoClientePage() {
  const profile = useProfile();
  const router = useRouter();
  const { data, error } = useLoader(fetchClientsBundle);

  return (
    <>
      <PageHeader title="Novo cliente" subtitle="O código (0001, 0002…) é dado automaticamente ao guardar." />
      {error && <Notice kind="erro">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <ClientForm
          initial={emptyClientForm(profile.id)}
          initialTags={[]}
          bundle={data}
          submitLabel="Guardar cliente"
          onSubmit={async (record, tagIds) => {
            const id = await createClient(record, tagIds);
            router.replace(`/clientes/ficha?id=${id}&novo=1`);
          }}
        />
      )}
    </>
  );
}
