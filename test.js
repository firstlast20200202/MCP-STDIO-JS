#!/usr/bin/env node

import { spawn } from "child_process";
import { strict as assert } from "assert";

class MCPTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    async runTest(testName, testFn) {
        console.error(`\n Running test: ${testName}`);
        this.currentTest = testName;

        try {
            await testFn();
            this.testResults.push({ name: testName, status: 'PASS' });
            console.error(` ${testName} - PASSED`);
        } catch (error) {
            this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
            console.error(` ${testName} - FAILED: ${error.message}`);
        }
    }

    // Helper to perform the required Model Context Protocol handshake
    async performHandshake(server) {
        // Step 1: Initialize negotiation
        const initResponse = await this.sendMessage(server, {
            jsonrpc: "2.0",
            id: 0,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05", // Standard MCP specification version
                capabilities: {},
                clientInfo: { name: "test-client", version: "1.0.0" }
            }
        });
        // console.error(` Received handshake response: ${JSON.stringify(initResponse)}`);
        
        assert.equal(initResponse.jsonrpc, "2.0");
        assert.ok(initResponse.result);

        // Step 2: Send initialized notification (No response expected back)
        server.stdin.write(JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized"
        }) + '\n');

        // Brief delay to let the server register initialization status
        await new Promise(r => setTimeout(r, 50));
    }

    async sendMessage(server, message) {
        return new Promise((resolve, reject) => {
            let responseData = '';
            let errorData = '';

            const timeout = setTimeout(() => {
                server.stdout.off('data', onData);
                console.error(`\n🚨 [TIMEOUT DIAGNOSTIC] Stalled on method: ${message.method}`);
                console.error(`   Raw buffer contents received so far: "${responseData}"`);

                reject(new Error(`Test timeout - no response received for method: ${message.method}`));
            }, 5000);

            const onData = (data) => {
                const chunk = data.toString();
                // console.error(`\n[DEBUG] Received chunk: "${chunk}"`);
                responseData += data.toString();
                if (responseData.includes('\n')) {
                    const lines = responseData.split('\n');
                    responseData = lines.pop(); // Keep any partial line for next data event
                    const completeLine = lines[0].trim();
                    if (completeLine) {
                        clearTimeout(timeout);
                        server.stdout.off('data', onData);
                        try {
                            resolve(JSON.parse(completeLine));
                        } catch (err) {
                            reject(new Error(`Failed to parse JSON response: ${completeLine}`));
                        }
                    }
                }
            };

            server.stdout.on('data', onData);
            server.stdin.write(JSON.stringify(message) + '\n');
        });
    }

    async testListTools() {
        const server = spawn('node', ['server.js'], { 
            env: {
                ...process.env,
                NODE_NO_WARNINGS: '1' // Enable Node.js warnings for debugging
            },
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'] 
        });

        server.stderr.on('data', (data) => console.error(`[Server Error] ${data.toString()}`));
        try {
            await this.performHandshake(server);
            const message = {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/list",
                params: {}
            };

            const response = await this.sendMessage(server, message);

            //validate response structure
            assert(response.jsonrpc === "2.0", "Response should have jsonrpc 2.0");
            assert(response.id === 1, "Response should have matching id");
            assert(response.result, "Response should have result");
            assert(Array.isArray(response.result.tools), "Result should have tools array");
            assert(response.result.tools.length === 1, "Should have exactly one tool");

            const tool = response.result.tools[0];
            assert(tool.name === "add-integers", "Tool name should be 'add-integers'");
            assert(tool.description, "Tool should have description");
            assert(tool.inputSchema, "Tool should have inputSchema");
            assert(tool.inputSchema.properties.a, "Tool should require parameter 'a'");
            assert(tool.inputSchema.properties.b, "Tool should require parameter 'b'");
        
        }
        finally {
            server.kill();
        }
    }

    async testAddIntegersValid() {
        const server = spawn('node', ['server.js'], { 
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'] 
        });
        server.stderr.on('data', (data) => console.error(`[Server Error] ${data.toString()}`));
        try {
            await this.performHandshake(server);
            const message = {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                    name: "add-integers",
                    arguments: {
                        a: 5, 
                        b: 3 
                    }
                }
            };

            const response = await this.sendMessage(server, message);

            assert(response.jsonrpc === "2.0", "Response should have jsonrpc 2.0");
            assert(response.id === 2, "Response should have matching id");
            assert(response.result, "Response should have result");
            assert(Array.isArray(response.result.content), "Result should have content array");
            assert(response.result.content.length === 1, "Content array should have one item");
            assert(response.result.content[0].type === "text", "Content type should be 'text'");
            assert(response.result.content[0].text === "8", "Result text should be '8'");

        } finally {
            server.kill();
        }
    }       

}

async function main() {
    const tester = new MCPTester();
    await tester.runTest("testListTools", tester.testListTools.bind(tester));
    await tester.runTest("testAddIntegersValid", tester.testAddIntegersValid.bind(tester));

    console.error('\n Test Summary:');
    tester.testResults.forEach(result => {
        console.error(`${result.name}: ${result.status}`);
        if (result.status === 'FAIL') {
            console.error(`  Error: ${result.error}`);
        }
    });
}

main().catch(err => {
    console.error('Error running tests:', err);
    process.exit(1);
});