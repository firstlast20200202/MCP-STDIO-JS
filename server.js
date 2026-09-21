#!/usr/bin/env node

//import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } 
    from "@modelcontextprotocol/sdk/server/stdio.js";
//import { StudioServerTransport } from "@modelcontextprotocol/sdk/server/transport/studio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";

const server = new McpServer(
    {
        name: "basic-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.registerTool(
    "add-integers",
    {
        description: "Add two integers and return the result",
        inputSchema: {
                a: z.number().int().describe("First integer to add"),
                b: z.number().int().describe("Second integer to add")
            },
    },
    async (request) => {
        const { a, b } = request;
        //const { name, argument: args } = request.params;
        const result = a + b;
            
        return {
            content: [
                {
                    type: "text",
                    text: `${result}`,
                },
            ],
        };
        // if(name === "add-integers") {
        //     console.error("Received request to add integers:", args);
        //     const { a, b } = args;

        //     // if(typeof a !== "number" || typeof b !== "number") {
        //     //     throw new Error("Both arguments must be numbers");
        //     // }

        //     // if(!Number.isInteger(a) || !Number.isInteger(b)) {
        //     //     throw new Error("Both arguments must be integers");
        //     // }

        //     const result = a + b;
            
        //     return {
        //         content: [
        //             {
        //                 type: "text",
        //                 text: `${result}`,
        //             },
        //         ],
        //     };
        // }
    }

)

// server.registerTool("add-integers", {
//     title: "Add Two Integers",
//     description: "Add two integers and return the result",
//     inputSchema: {
//         type: "object",
//         properties: {
//             a: {
//                 type: "integer",
//                 description: "First integer to add",
//             },
//             b: {
//                 type: "integer",
//                 description: "Second integer to add",
//             },
//         },
//         required: ["a", "b"],
        
//     },

// handler: async (request) => {
//     const { name, argument: args } = request.params;

//     if(name === "add-integers") {
//         const { a, b } = args;

//         if(typeof a !== "number" || typeof b !== "number") {
//             throw new Error("Both arguments must be numbers");
//         }

//         if(!Number.isInteger(a) || !Number.isInteger(b)) {
//             throw new Error("Both arguments must be integers");
//         }

//         const result = a + b;
        
//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: `${result}`,
//                 },
//             ],
//         };
//     }

//     throw new Error(`Unknown tool: ${name}`);
// }
// });

// server.setRequestHandler(ListToolsRequestSchema, async () => {
//     return {
//         tools: [
//             {
//                 name: "add-integers",
//                 description: "Add two integers and return the result",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         a: {
//                             type: "integer",
//                             description: "First integer to add",
//                         },
//                         b: {
//                             type: "integer",
//                             description: "Second integer to add",
//                         },
//                     },
//                     required: ["a", "b"],
//                 },
//             },
//         ],
//     };
// });

// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//     const { name, argument: args } = request.params;

//     if(name === "add-integers") {
//         const { a, b } = args;

//         if(typeof a !== "number" || typeof b !== "number") {
//             throw new Error("Both arguments must be numbers");
//         }

//         if(!Number.isInteger(a) || !Number.isInteger(b)) {
//             throw new Error("Both arguments must be integers");
//         }

//         const result = a + b;
        
//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: '${result}',
//                 },
//             ],
//         };
//     }

//     throw new Error('Unknown tool: ${name}');
// });

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    //console.error("Basic MCP Server running on stdio");
}

main().catch((error) => {
    //console.error("Server error:", error);
    process.exit(1);
});