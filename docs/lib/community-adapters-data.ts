export interface CommunityAdapter {
	name: string;
	url: string;
	database: string;
	databaseUrl: string;
	author: {
		name: string;
		url: string;
		avatar: string;
	};
}

export const communityAdapters: CommunityAdapter[] = [
	{
		name: "@convex-dev/cinaauth",
		url: "https://github.com/get-convex/cinaauth",
		database: "Convex",
		databaseUrl: "https://www.convex.dev/",
		author: {
			name: "erquhart",
			url: "https://github.com/erquhart",
			avatar: "https://github.com/erquhart.png",
		},
	},
	{
		name: "surreal-cinaauth",
		url: "https://github.com/oskar-gmerek/surreal-cinaauth",
		database: "SurrealDB",
		databaseUrl: "https://surrealdb.com/",
		author: {
			name: "Oskar Gmerek",
			url: "https://oskargmerek.com",
			avatar: "https://github.com/oskar-gmerek.png",
		},
	},
	{
		name: "surrealdb-cinaauth",
		url: "https://github.com/Necmttn/surrealdb-cinaauth",
		database: "SurrealDB",
		databaseUrl: "https://surrealdb.com/",
		author: {
			name: "Necmttn",
			url: "https://github.com/Necmttn",
			avatar: "https://github.com/Necmttn.png",
		},
	},
	{
		name: "cinaauth-surrealdb",
		url: "https://github.com/msanchezdev/cinaauth-surrealdb",
		database: "SurrealDB",
		databaseUrl: "https://surrealdb.com/",
		author: {
			name: "msanchezdev",
			url: "https://github.com/msanchezdev",
			avatar: "https://github.com/msanchezdev.png",
		},
	},
	{
		name: "payload-auth",
		url: "https://github.com/payload-auth/payload-auth",
		database: "Payload CMS",
		databaseUrl: "https://payloadcms.com/",
		author: {
			name: "forrestdevs",
			url: "https://github.com/forrestdevs",
			avatar: "https://github.com/forrestdevs.png",
		},
	},
	{
		name: "@delmaredigital/payload-cinaauth",
		url: "https://github.com/delmaredigital/payload-cinaauth",
		database: "Payload CMS",
		databaseUrl: "https://payloadcms.com/",
		author: {
			name: "Delmare Digital",
			url: "https://github.com/delmaredigital",
			avatar: "https://github.com/delmaredigital.png",
		},
	},
	{
		name: "@hedystia/cinaauth-typeorm",
		url: "https://github.com/Zastinian/cinaauth-typeorm",
		database: "TypeORM",
		databaseUrl: "https://typeorm.io/",
		author: {
			name: "Zastinian",
			url: "https://github.com/Zastinian",
			avatar: "https://github.com/Zastinian.png",
		},
	},
	{
		name: "cinaauth-instantdb",
		url: "https://github.com/daveyplate/cinaauth-instantdb",
		database: "InstantDB",
		databaseUrl: "https://www.instantdb.com/",
		author: {
			name: "daveycodez",
			url: "https://github.com/daveycodez",
			avatar: "https://github.com/daveycodez.png",
		},
	},
	{
		name: "@nerdfolio/remult-cinaauth",
		url: "https://github.com/nerdfolio/remult-cinaauth",
		database: "Remult",
		databaseUrl: "https://remult.dev/",
		author: {
			name: "Tai Vo",
			url: "https://github.com/taivo",
			avatar: "https://github.com/taivo.png",
		},
	},
	{
		name: "pocketbase-cinaauth",
		url: "https://github.com/LightInn/pocketbase-cinaauth",
		database: "PocketBase",
		databaseUrl: "https://pocketbase.io/",
		author: {
			name: "LightInn",
			url: "https://github.com/LightInn",
			avatar: "https://github.com/LightInn.png",
		},
	},
	{
		name: "cinaauth-firestore",
		url: "https://github.com/yultyyev/cinaauth-firestore",
		database: "Firebase Firestore",
		databaseUrl: "https://firebase.google.com/docs/firestore",
		author: {
			name: "yultyyev",
			url: "https://github.com/yultyyev",
			avatar: "https://github.com/yultyyev.png",
		},
	},
	{
		name: "@zenstackhq/cinaauth",
		url: "https://github.com/zenstackhq/zenstack-v3/tree/main/packages/auth-adapters/cinaauth",
		database: "ZenStack",
		databaseUrl: "https://zenstack.dev",
		author: {
			name: "zenstackhq",
			url: "https://github.com/zenstackhq",
			avatar: "https://github.com/zenstackhq.png",
		},
	},
	{
		name: "@strapi-community/plugin-cinaauth",
		url: "https://github.com/strapi-community/plugin-cinaauth",
		database: "Strapi CMS",
		databaseUrl: "https://strapi.io/",
		author: {
			name: "boazpoolman",
			url: "https://github.com/boazpoolman",
			avatar: "https://github.com/boazpoolman.png",
		},
	},
	{
		name: "neo4j-cinaauth",
		url: "https://github.com/florianamette/cinaauth-neo4j",
		database: "Neo4j",
		databaseUrl: "https://neo4j.com/",
		author: {
			name: "florianamette",
			url: "https://github.com/florianamette",
			avatar: "https://github.com/florianamette.png",
		},
	},
	{
		name: "cinaauth-mikro-orm",
		url: "https://github.com/octet-stream/cinaauth-mikro-orm",
		database: "MikroORM",
		databaseUrl: "https://mikro-orm.io/",
		author: {
			name: "octet-stream",
			url: "https://github.com/octet-stream",
			avatar: "https://github.com/octet-stream.png",
		},
	},
];
