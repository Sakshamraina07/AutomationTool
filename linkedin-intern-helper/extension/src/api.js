// api.js
// Central API Config for connecting Extension directly to Supabase

import { createClient } from '@supabase/supabase-js';

export const USER_ID = "default-user"; // Static User MVP Identity

const supabaseUrl = 'https://nhgbwprscnzhktqvfcgl.supabase.co';
const supabaseKey = 'sb_publishable_Fr5KJ1xi8GHRkcXFnji_Lg_FCnkqGHc';

export const supabase = createClient(supabaseUrl, supabaseKey);
