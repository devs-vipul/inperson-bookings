/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as availability from "../availability.js";
import type * as bookings from "../bookings.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as sessions from "../sessions.js";
import type * as storage from "../storage.js";
import type * as stripe from "../stripe.js";
import type * as stripeProducts from "../stripeProducts.js";
import type * as subscriptions from "../subscriptions.js";
import type * as trainerSlots from "../trainerSlots.js";
import type * as trainers from "../trainers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  availability: typeof availability;
  bookings: typeof bookings;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  sessions: typeof sessions;
  storage: typeof storage;
  stripe: typeof stripe;
  stripeProducts: typeof stripeProducts;
  subscriptions: typeof subscriptions;
  trainerSlots: typeof trainerSlots;
  trainers: typeof trainers;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
