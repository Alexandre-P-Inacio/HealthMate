import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nlbfugbqzecmbzqqijen.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmZ1Z2JxemVjbWJ6cXFpamVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxODA5MTksImV4cCI6MjA1NTc1NjkxOX0.pwVGS6shMtoXrK30uSGspScz359uVCje1Gp4cZ4G3Vw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
