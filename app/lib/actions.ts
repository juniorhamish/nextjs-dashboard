'use server';
import {z} from 'zod';
import postgres from "postgres";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {signIn} from "@/auth";
import {AuthError} from "next-auth";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};
const InvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.'
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});
const CreateInvoiceSchema = InvoiceSchema.omit({id: true, date: true});
const UpdateInvoiceSchema = InvoiceSchema.omit({id: true, date: true});

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoiceSchema.safeParse(Object.fromEntries(formData));
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    const {customerId, amount, status} = validatedFields.data;
    try {
        await sql`INSERT INTO invoices (customer_id, amount, status, date) values (${customerId}, ${amount * 100}, ${status}, now());`;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }
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

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}
