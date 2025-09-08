'use server';
import {z} from 'zod';
import postgres from "postgres";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const InvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});
const CreateInvoiceSchema = InvoiceSchema.omit({id: true, date: true});
const UpdateInvoiceSchema = InvoiceSchema.omit({id: true, date: true});

export async function createInvoice(formData: FormData) {
    const {customerId, amount, status} = CreateInvoiceSchema.parse(Object.fromEntries(formData));
    await sql`INSERT INTO invoices (customer_id, amount, status, date) values (${customerId}, ${amount * 100}, ${status}, now());`;
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
    const {customerId, amount, status} = UpdateInvoiceSchema.parse(Object.fromEntries(formData));
    await sql`UPDATE invoices SET customer_id = ${customerId}, amount = ${amount * 100}, status = ${status} WHERE id = ${id};`;
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    await sql`DELETE FROM invoices WHERE id = ${id};`;
    revalidatePath('/dashboard/invoices');
}

