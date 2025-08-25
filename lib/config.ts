/**
 * Global app configuration
 * @env QISCUS_API_URL - Qiscus API url, default is https://omnichannel.qiscus.com/api
 * @env QISCUSK_KEY - Your Qiscus secret key
 * @env QISCUS_APP_ID - Your Qiscus app id
 * @env QISCUS_AGENT_DIVISION_ID - Your agent division id
 * @env AGENT_MAX_CUSTOMERS - Max customer an agent can handle
 * @env DATABASE_URL - Your database url
 */
const appConfig = {
    apiUrl: process.env.QISCUS_API_URL!,
    secretKey: process.env.QISCUS_KEY!,
    appId: process.env.QISCUS_APP_ID!,
    agentDivisionId: Number(process.env.QISCUS_AGENT_DIVISON_ID!),
    agentMaxCustomer: Number(process.env.AGENT_MAX_CUSTOMERS!),
    dbUrl: process.env.DATABASE_URL!,
};

export default appConfig;
