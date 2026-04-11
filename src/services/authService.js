import { supabase } from '../lib/supabaseClient.js';
import { log } from '../modules/utils/logger.js';

/**
 * Sign up a new user with email, password, and metadata
 */
export const signUpUser = async (email, password, metadata) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata // Contains name, phone etc., passed to auth.users raw_app_meta_data
      }
    });
    if (error) throw error;
    log('AUTH', 'INFO', `User signed up: ${email}`);
    return { data, error: null };
  } catch (err) {
    log('AUTH', 'ERROR', 'SignUp failed', err);
    return { data: null, error: err };
  }
};

/**
 * Sign in existing user
 */
export const signInUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    log('AUTH', 'INFO', `User signed in: ${email}`);
    return { data, error: null };
  } catch (err) {
    log('AUTH', 'ERROR', 'SignIn failed', err);
    return { data: null, error: err };
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    log('AUTH', 'INFO', `User signed out`);
    return { error: null };
  } catch (err) {
    log('AUTH', 'ERROR', 'SignOut failed', err);
    return { error: err };
  }
};

/**
 * Get current session manually (usually Context handles tracking)
 */
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};
