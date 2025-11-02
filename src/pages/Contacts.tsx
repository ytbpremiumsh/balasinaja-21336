import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contacts:", error);
    } else {
      setContacts(data || []);
    }
  };

  return (
    <Layout>
      <ExpiredUserGuard>
        <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Contacts
          </h1>
          <p className="text-muted-foreground mt-2">
            Kontak yang pernah mengirim pesan ke sistem autoreply
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Daftar Kontak ({contacts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Nomor Telepon</th>
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium">Ditambahkan</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        Belum ada kontak tersimpan
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 font-mono text-sm">{contact.phone}</td>
                        <td className="py-3 text-sm">{contact.name || "-"}</td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {new Date(contact.created_at).toLocaleDateString("id-ID")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      </ExpiredUserGuard>
    </Layout>
  );
}
