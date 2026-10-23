import { checkAndSendAllSetupReminders, checkAndSendSetupReminderForShop } from "../utils/setupReminder.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const targetShop = url.searchParams.get("shop");
  const force = url.searchParams.get("force") === "true";

  if (targetShop) {
    const res = await checkAndSendSetupReminderForShop(targetShop, { force });
    return Response.json(res);
  }

  const result = await checkAndSendAllSetupReminders();
  return Response.json(result);
}

export async function action({ request }) {
  const url = new URL(request.url);
  const targetShop = url.searchParams.get("shop");
  const force = url.searchParams.get("force") === "true";

  if (targetShop) {
    const res = await checkAndSendSetupReminderForShop(targetShop, { force });
    return Response.json(res);
  }

  const result = await checkAndSendAllSetupReminders();
  return Response.json(result);
}
