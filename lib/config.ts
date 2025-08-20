/**
 * Global app configuration
 * @env QISCUS_API_URL - Qiscus API url, default is https://omnichannel.qiscus.com/api
 * @env QISCUSK_KEY - Your Qiscus secret key
 * @env QISCUS_APP_ID - Your Qiscus app id
 * @env QISCUS_ADMIN_TOKEN - Your Qiscus admin token, see documentations {@link https://omnichannel.qiscus.com/docs here}
 * @env AGENT_MAX_CUSTOMERS - Max customer an agent can handle
 */
const appConfig = {
    qiscusApiURL: process.env.QISCUS_API_URL!,
    qiscusKey: process.env.QISCUS_KEY!,
    qiscusAppId: process.env.QISCUS_APP_ID!,
    qiscusAdminToken: process.env.QISCUS_ADMIN_TOKEN!,
    maxCustomers: Number(process.env.AGENT_MAX_CUSTOMERS!),
};

export default appConfig;
