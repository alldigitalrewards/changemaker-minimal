  ⎿ ### Generate and Stream AI Text from Server with AI SDK

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/20-rsc/20-stream-text.mdx

    This server-side function implements the text generation logic using `streamText` from the `ai` package and the `openai` model. It leverages `createStreamableValue` from
    `@ai-sdk/rsc` to wrap the generated text stream, allowing it to be sent incrementally to the client. The function asynchronously updates the stream with text deltas until
    generation is complete.

    ```TypeScript
    'use server';

    import { streamText } from 'ai';
    import { openai } from '@ai-sdk/openai';
    import { createStreamableValue } from '@ai-sdk/rsc';

    export async function generate(input: string) {
      const stream = createStreamableValue('');

      (async () => {
        const { textStream } = streamText({
          model: openai('gpt-3.5-turbo'),
          prompt: input,
        });

        for await (const delta of textStream) {
          stream.update(delta);
        }

        stream.done();
      })();

      return { output: stream.value };
    }
    ```

    --------------------------------

    ### Stream text generation from Apple AI provider

    Source: https://github.com/vercel/ai/blob/main/content/providers/03-community-providers/90-react-native-apple.mdx

    Illustrates how to stream text generation results in real-time using `streamText` with the Apple provider, processing and logging text chunks as they become available for
    dynamic user interfaces.

    ```TypeScript
    import { apple } from '@react-native-ai/apple';
    import { streamText } from 'ai';

    const result = streamText({
      model: apple(),
      prompt: 'Write a short story about space exploration',
    });

    for await (const chunk of result.textStream) {
      console.log(chunk);
    }
    ```

    --------------------------------

    ### Read UIMessage Streams for Basic Text Generation (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/04-ai-sdk-ui/24-reading-ui-message-streams.mdx

    Demonstrates how to use `readUIMessageStream` to process a stream of `UIMessage` objects generated from a basic text streaming operation. It logs the current state of each
    message as it's constructed, useful for real-time UI updates or custom stream processing.

    ```tsx
    import { openai } from '@ai-sdk/openai';
    import { readUIMessageStream, streamText } from 'ai';

    async function main() {
      const result = streamText({
        model: openai('gpt-4o'),
        prompt: 'Write a short story about a robot.',
      });

      for await (const uiMessage of readUIMessageStream({
        stream: result.toUIMessageStream(),
      })) {
        console.log('Current message state:', uiMessage);
      }
    }
    ```

    --------------------------------

    ### Stream Text Generation with AI SDK and OpenAI (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/02-foundations/05-streaming.mdx

    This TypeScript code snippet demonstrates how to implement streaming text generation using the Vercel AI SDK. It utilizes the `streamText` function to interact with an OpenAI
     model (`gpt-4.1`), providing a prompt and then asynchronously iterating over the `textStream` to log each generated text part. This pattern allows for real-time display of
    AI responses, significantly enhancing user experience by avoiding long waiting times for complete outputs.

    ```typescript
    import { streamText } from 'ai';

    const { textStream } = streamText({
      model: 'openai/gpt-4.1',
      prompt: 'Write a poem about embedding models.',
    });

    for await (const textPart of textStream) {
      console.log(textPart);
    }
    ```

    --------------------------------

    ### AI SDK UI: Stream Text with Route Handler for Chat Completions

    Source: https://github.com/vercel/ai/blob/main/content/docs/05-ai-sdk-rsc/10-migrating-to-ui.mdx

    This example shows the AI SDK UI approach, separating text generation into a dedicated route handler. It uses `streamText` to generate and stream text completions from the
    server, which can then be consumed by a client-side hook like `useChat` to render the UI.

    ```TypeScript
    import { streamText } from 'ai';
    import { openai } from '@ai-sdk/openai';

    export async function POST(request) {
      const { messages } = await request.json();

      const result = streamText({
        model: openai('gpt-4o'),
        system: 'you are a friendly assistant!',
        messages,
        tools: {
          // tool definitions
        },
      });

      return result.toUIMessageStreamResponse();
    }
    ```

    --------------------------------

    ### Stream Text from LLMs using AI SDK Core (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/05-generating-text.mdx

    This example demonstrates how to use the `streamText` function from AI SDK Core to stream text generated by a large language model. It shows how to initialize the function
    with a model and a prompt, then iterate asynchronously over the `textStream` to process text parts as they arrive, improving user experience in interactive applications.

    ```typescript
    import { streamText } from 'ai';

    const result = streamText({
      model: 'openai/gpt-4.1',
      prompt: 'Invent a new holiday and describe its traditions.',
    });

    // example: use textStream as an async iterable
    for await (const textPart of result.textStream) {
      console.log(textPart);
    }
    ```

    --------------------------------

    ### AI SDK RSC: Handle Generation and UI Rendering in Server Action

    Source: https://github.com/vercel/ai/blob/main/content/docs/05-ai-sdk-rsc/10-migrating-to-ui.mdx

    This code snippet illustrates the AI SDK RSC approach where text generation and UI rendering are combined within a single server action. It uses `getMutableAIState` to manage
     messages and `streamUI` to stream the user interface response directly from the server.

    ```TypeScript
    import { openai } from '@ai-sdk/openai';
    import { getMutableAIState, streamUI } from '@ai-sdk/rsc';

    export async function sendMessage(message: string) {
      'use server';

      const messages = getMutableAIState('messages');

      messages.update([...messages.get(), { role: 'user', content: message }]);

      const { value: stream } = await streamUI({
        model: openai('gpt-4o'),
        system: 'you are a friendly assistant!',
        messages: messages.get(),
        text: async function* ({ content, done }) {
          // process text
        },
        tools: {
          // tool definitions
        },
      });

      return stream;
    }
    ```

    --------------------------------

    ### Process Stream Chunks with AI SDK streamText onChunk Callback (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/05-generating-text.mdx

    This example shows how to utilize the `onChunk` callback in `streamText` to process different types of stream data as they are generated. The callback receives chunk objects,
     allowing developers to implement custom logic for handling text, reasoning, tool calls, or other stream components in real-time.

    ```typescript
    import { streamText } from 'ai';

    const result = streamText({
      model: 'openai/gpt-4.1',
      prompt: 'Invent a new holiday and describe its traditions.',
      onChunk({ chunk }) {
        // implement your own logic here, e.g.:
        if (chunk.type === 'text') {
          console.log(chunk.text);
        }
      },
    });
    ```

    --------------------------------

    ### Stream Text without Reader using AI SDK and TypeScript

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/05-node/20-stream-text.mdx

    This snippet demonstrates how to stream text generated by an AI model directly using a 'for await...of' loop over the 'textStream' property. It utilizes the '@ai-sdk/openai'
    package for the OpenAI model and the 'ai' package for 'streamText'. The generated text parts are logged to the console as they arrive.

    ```typescript
    import { streamText } from 'ai';
    import { openai } from '@ai-sdk/openai';

    const result = streamText({
      model: openai('gpt-4o'),
      maxOutputTokens: 512,
      prompt: 'Invent a new holiday and describe its traditions.',
    });

    for await (const textPart of result.textStream) {
      console.log(textPart);
    }
    ```

    --------------------------------

    ### Server-side AI Text Streaming API Route in Next.js

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/01-next/20-stream-text.mdx

    This Next.js API route (`/api/completion`) serves as the backend for AI text generation. It processes client prompts, uses the `ai` module's `streamText` function with an
    OpenAI model, and streams the results back to the client, enabling real-time text delivery for dynamic applications.

    ```typescript
    import { openai } from '@ai-sdk/openai';
    import { streamText } from 'ai';

    export async function POST(req: Request) {
      const { prompt }: { prompt: string } = await req.json();

      const result = streamText({
        model: openai('gpt-4'),
        system: 'You are a helpful assistant.',
        prompt,
      });

      return result.toUIMessageStreamResponse();
    }
    ```

    --------------------------------

    ### Process All Streaming Events with fullStream in AI SDK Core (TypeScript/TSX)

    Source: https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/05-generating-text.mdx

    This example illustrates how to access the `fullStream` property of a `streamText` result to process all streaming events. It allows for fine-grained control over UI
    rendering or custom handling of various event types, such as text deltas, tool calls, or errors. The code iterates through the stream parts and uses a `switch` statement to
    handle different event types.

    ```tsx
    import { streamText } from 'ai';
    import { z } from 'zod';

    const result = streamText({
      model: 'openai/gpt-4.1',
      tools: {
        cityAttractions: {
          inputSchema: z.object({ city: z.string() }),
          execute: async ({ city }) => ({
            attractions: ['attraction1', 'attraction2', 'attraction3'],
          }),
        },
      },
      prompt: 'What are some San Francisco tourist attractions?',
    });

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'start': {
          // handle start of stream
          break;
        }
        case 'start-step': {
          // handle start of step
          break;
        }
        case 'text-start': {
          // handle text start
          break;
        }
        case 'text-delta': {
          // handle text delta here
          break;
        }
        case 'text-end': {
          // handle text end
          break;
        }
        case 'reasoning-start': {
          // handle reasoning start
          break;
        }
        case 'reasoning-delta': {
          // handle reasoning delta here
          break;
        }
        case 'reasoning-end': {
          // handle reasoning end
          break;
        }
        case 'source': {
          // handle source here
          break;
        }
        case 'file': {
          // handle file here
          break;
        }
        case 'tool-call': {
          switch (part.toolName) {
            case 'cityAttractions': {
              // handle tool call here
              break;
            }
          }
          break;
        }
        case 'tool-input-start': {
          // handle tool input start
          break;
        }
        case 'tool-input-delta': {
          // handle tool input delta
          break;
        }
        case 'tool-input-end': {
          // handle tool input end
          break;
        }
        case 'tool-result': {
          switch (part.toolName) {
            case 'cityAttractions': {
              // handle tool result here
              break;
            }
          }
          break;
        }
        case 'tool-error': {
          // handle tool error
          break;
        }
        case 'finish-step': {
          // handle finish step
          break;
        }
        case 'finish': {
          // handle finish here
          break;
        }
        case 'error': {
          // handle error here
          break;
        }
        case 'raw': {
          // handle raw value
          break;
        }
      }
    }
    ```

    --------------------------------

    ### Stream Text from OpenAI Model (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/07-reference/01-ai-sdk-core/02-stream-text.mdx

    This example demonstrates how to use the `streamText` function with an OpenAI GPT-4o model to generate text incrementally. It imports necessary modules, configures the model
    with a prompt, and iterates over the resulting text stream to output each part.

    ```typescript
    import { openai } from '@ai-sdk/openai';
    import { streamText } from 'ai';

    const { textStream } = streamText({
      model: openai('gpt-4o'),
      prompt: 'Invent a new holiday and describe its traditions.',
    });

    for await (const textPart of textStream) {
      process.stdout.write(textPart);
    }
    ```

    --------------------------------

    ### Stream AI-generated Text to Client with React and AI SDK

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/20-rsc/20-stream-text.mdx

    This React component demonstrates how to consume a real-time stream of AI-generated text on the client-side. It uses `readStreamableValue` from `@ai-sdk/rsc` to update the UI
     incrementally as text deltas arrive from the server, triggered by a button click. The `maxDuration` export allows streaming responses for up to 30 seconds.

    ```TSX
    'use client';

    import { useState } from 'react';
    import { generate } from './actions';
    import { readStreamableValue } from '@ai-sdk/rsc';

    // Allow streaming responses up to 30 seconds
    export const maxDuration = 30;

    export default function Home() {
      const [generation, setGeneration] = useState<string>('');

      return (
        <div>
          <button
            onClick={async () => {
              const { output } = await generate('Why is the sky blue?');

              for await (const delta of readStreamableValue(output)) {
                setGeneration(currentGeneration => `${currentGeneration}${delta}`);
              }
            }}
          >
            Ask
          </button>

          <div>{generation}</div>
        </div>
      );
    }
    ```

    --------------------------------

    ### POST /

    Source: https://github.com/vercel/ai/blob/main/examples/express/README.md

    This endpoint initiates a basic text generation or streaming process. It likely accepts a prompt and returns AI-generated content.

    ```APIDOC
    ## POST /

    ### Description
    Initiates a basic text generation or streaming process using the AI SDK. It expects a prompt as input.

    ### Method
    POST

    ### Endpoint
    /

    ### Parameters
    #### Request Body
    - **prompt** (string) - Optional - The text prompt for generation. If not provided, a default might be used.

    ### Request Example
    ```json
    {
      "prompt": "Write a short story about a brave knight."
    }
    ```

    ### Response
    #### Success Response (200)
    - **stream** (text/event-stream) - A stream of generated text content.

    #### Response Example
    ```text
    "Once upon a time..."
    ```
    ```

    --------------------------------

    ### Stream Text with Real-time Tool Execution using Vercel AI SDK

    Source: https://context7.com/vercel/ai/llms.txt

    This TypeScript example illustrates streaming text generation with the `streamText` function from the Vercel AI SDK. It includes real-time tool calling (e.g., `searchWeb`)
    and event callbacks for processing text chunks and handling stream completion. The example shows how to consume the streamed text chunk by chunk or retrieve the full result.

    ```typescript
    import { streamText } from 'ai';
    import { anthropic } from '@ai-sdk/anthropic';
    import { z } from 'zod';

    const result = streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: 'You are a helpful assistant with access to real-time data.',
      prompt: 'Search for recent news about AI and summarize the top 3 articles.',
      tools: {
        searchWeb: {
          description: 'Search the web for information',
          parameters: z.object({
            query: z.string()
          }),
          execute: async ({ query }) => {
            // Perform web search
            return { results: ['Article 1...', 'Article 2...', 'Article 3...'] };
          }
        }
      },
      onChunk: async ({ chunk }) => {
        if (chunk.type === 'text-delta') {
          process.stdout.write(chunk.text);
        }
      },
      onFinish: async ({ text, toolCalls, usage, steps }) => {
        console.log('\n\nGeneration complete');
        console.log('Total steps:', steps.length);
        console.log('Total tokens:', usage.totalTokens);
      }
    });

    // Multiple ways to consume the stream
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }

    // Or get the full result
    const { text, toolResults } = await result;
    ```

    --------------------------------

    ### AI SDK UI: Stream Object Generation via Route Handler (After Migration)

    Source: https://github.com/vercel/ai/blob/main/content/docs/05-ai-sdk-rsc/10-migrating-to-ui.mdx

    This API route handler demonstrates how to implement server-side object streaming using `streamObject` from `ai` within a Next.js route. It takes context from the request
    body and generates structured objects based on a schema, returning the result as a text stream response optimized for AI SDK UI hooks.

    ```ts
    import { streamObject } from 'ai';
    import { openai } from '@ai-sdk/openai';
    import { notificationSchema } from '@/utils/schemas';

    export async function POST(req: Request) {
      const context = await req.json();

      const result = streamObject({
        model: openai('gpt-4.1'),
        schema: notificationSchema,
        prompt:
          `Generate 3 notifications for a messages app in this context:` + context,
      });

      return result.toTextStreamResponse();
    }
    ```

    --------------------------------

    ### Generate Text with React Client Component

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/20-rsc/10-generate-text.mdx

    This React client component (`Home`) demonstrates how to initiate text generation from a button click. It uses React's `useState` hook to display the generated text and calls
     a server action (`getAnswer`) to perform the AI text generation. The component is marked with `'use client'` for client-side rendering and sets `maxDuration` for streaming
    responses.

    ```tsx
    'use client';

    import { useState } from 'react';
    import { getAnswer } from './actions';

    // Allow streaming responses up to 30 seconds
    export const maxDuration = 30;

    export default function Home() {
      const [generation, setGeneration] = useState<string>('');

      return (
        <div>
          <button
            onClick={async () => {
              const { text } = await getAnswer('Why is the sky blue?');
              setGeneration(text);
            }}
          >
            Answer
          </button>
          <div>{generation}</div>
        </div>
      );
    }
    ```

    --------------------------------

    ### Smooth Text Stream with experimental_transform in AI SDK Core (TypeScript/TSX)

    Source: https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/05-generating-text.mdx

    This snippet shows how to apply transformations to a text stream using the `experimental_transform` option with `streamText`. Specifically, it uses the `smoothStream`
    function to smooth out text streaming, which can improve the user experience by providing a more consistent output. Transformations are applied before other callbacks like
    `onFinish` are invoked.

    ```tsx
    import { smoothStream, streamText } from 'ai';

    const result = streamText({
      model,
      prompt,
      experimental_transform: smoothStream(),
    });
    ```

    --------------------------------

    ### Handle Stream Finish with onFinish Callback in AI SDK Core (TypeScript/TSX)

    Source: https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/05-generating-text.mdx

    This snippet demonstrates how to use the `onFinish` callback with `streamText` in the AI SDK Core. The callback executes once the text stream is complete, providing access to
     the final text, usage information, finish reason, and generated messages. It is useful for saving chat history or recording resource usage after a stream ends.

    ```tsx
    import { streamText } from 'ai';

    const result = streamText({
      model: 'openai/gpt-4.1',
      prompt: 'Invent a new holiday and describe its traditions.',
      onFinish({ text, finishReason, usage, response, steps, totalUsage }) {
        // your own logic, e.g. for saving the chat history or recording usage

        const messages = response.messages; // messages that were generated
      },
    });
    ```

    --------------------------------

    ### Stream Text with Computer Tools (Real-time)

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/00-guides/05-computer-use.mdx

    This snippet demonstrates using the `computerTool` with the `streamText` function for real-time streaming responses. It allows the application to receive and process text
    updates as they are generated by the model, potentially including tool-related outputs.

    ```TypeScript
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: 'Open the browser and navigate to vercel.com',
      tools: { computer: computerTool },
    });

    for await (const chunk of result.textStream) {
      console.log(chunk);
    }
    ```

    --------------------------------

    ### Stream UI messages from Express server using AI SDK

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/15-api-servers/20-express.mdx

    Shows how to set up an Express endpoint to generate and stream AI-generated text as UI messages to the client using `pipeUIMessageStreamToResponse`. It initializes an Express
     app, defines a POST route, and uses `streamText` with OpenAI's `gpt-4o` model to invent a new holiday and its traditions.

    ```ts
    import { openai } from '@ai-sdk/openai';
    import { streamText } from 'ai';
    import express, { Request, Response } from 'express';

    const app = express();

    app.post('/', async (req: Request, res: Response) => {
      const result = streamText({
        model: openai('gpt-4o'),
        prompt: 'Invent a new holiday and describe its traditions.',
      });

      result.pipeUIMessageStreamToResponse(res);
    });

    app.listen(8080, () => {
      console.log(`Example app listening on port ${8080}`);
    });
    ```

    --------------------------------

    ### Generate Text with Google Generative AI Model in TypeScript

    Source: https://github.com/vercel/ai/blob/main/content/providers/01-ai-sdk-providers/15-google-generative-ai.mdx

    This example shows how to use the `generateText` function from the AI SDK to produce text output from a Google Generative AI model. It imports necessary modules, initializes
    a model, and provides a prompt to generate content, such as a recipe.

    ```ts
    import { google } from '@ai-sdk/google';
    import { generateText } from 'ai';

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: 'Write a vegetarian lasagna recipe for 4 people.',
    });
    ```

    --------------------------------

    ### Use createUIMessageStream with text and merged streams (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/07-reference/02-ai-sdk-ui/40-create-ui-message-stream.mdx

    Demonstrates how to initialize and use `createUIMessageStream` to construct a UI message stream. It shows how to write individual text chunks with consistent IDs, integrate
    results from `streamText` into the main stream, and includes custom error handling and a finish callback for comprehensive stream management.

    ```tsx
    const existingMessages: UIMessage[] = [
      /* ... */
    ];

    const stream = createUIMessageStream({
      async execute({ writer }) {
        // Start a text message
        // Note: The id must be consistent across text-start, text-delta, and text-end steps
        // This allows the system to correctly identify they belong to the same text block
        writer.write({
          type: 'text-start',
          id: 'example-text',
        });

        // Write a message chunk
        writer.write({
          type: 'text-delta',
          id: 'example-text',
          delta: 'Hello',
        });

        // End the text message
        writer.write({
          type: 'text-end',
          id: 'example-text',
        });

        // Merge another stream from streamText
        const result = streamText({
          model: openai('gpt-4o'),
          prompt: 'Write a haiku about AI',
        });

        writer.merge(result.toUIMessageStream());
      },
      onError: error => `Custom error: ${error.message}`,
      originalMessages: existingMessages,
      onFinish: ({ messages, isContinuation, responseMessage }) => {
        console.log('Stream finished with messages:', messages);
      },
    });
    ```

    --------------------------------

    ### POST /custom-data-parts

    Source: https://github.com/vercel/ai/blob/main/examples/express/README.md

    This endpoint handles text generation or streaming that involves custom data parts, allowing for more structured AI outputs beyond simple text.

    ```APIDOC
    ## POST /custom-data-parts

    ### Description
    Generates and streams content that might include custom data parts, allowing the AI to return structured information alongside text.

    ### Method
    POST

    ### Endpoint
    /custom-data-parts

    ### Parameters
    #### Request Body
    - **input** (object) - Optional - Input object, potentially containing a prompt and definitions for custom data parts.

    ### Request Example
    ```json
    {
      "prompt": "Generate a recipe for chocolate chip cookies.",
      "format": "json"
    }
    ```

    ### Response
    #### Success Response (200)
    - **stream** (text/event-stream) - A stream of generated content, potentially including JSON or other structured data parts.

    #### Response Example
    ```text
    "data: {"recipeName": "Chocolate Chip Cookies", "ingredients": [...]}..."
    ```
    ```

    --------------------------------

    ### Implement Server-Side Chat Streaming with AI SDK and OpenAI

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/20-rsc/21-stream-text-with-chat-prompt.mdx

    This server-side function `continueConversation` handles the core logic for generating and streaming AI responses. It defines the message structure, uses `streamText` from
    the `ai` library with an OpenAI model, and leverages `createStreamableValue` from `@ai-sdk/rsc` to send incremental text updates back to the client.

    ```typescript
    'use server';

    import { streamText } from 'ai';
    import { openai } from '@ai-sdk/openai';
    import { createStreamableValue } from '@ai-sdk/rsc';

    export interface Message {
      role: 'user' | 'assistant';
      content: string;
    }

    export async function continueConversation(history: Message[]) {
      'use server';

      const stream = createStreamableValue();

      (async () => {
        const { textStream } = streamText({
          model: openai('gpt-3.5-turbo'),
          system:
            "You are a dude that doesn't drop character until the DVD commentary.",
          messages: history,
        });

        for await (const text of textStream) {
          stream.update(text);
        }

        stream.done();
      })();

      return {
        messages: history,
        newMessage: stream.value,
      };
    }
    ```

    --------------------------------

    ### Generate Text Client-Side with React and Next.js

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/01-next/10-generate-text.mdx

    This React component demonstrates how to trigger text generation from the client-side. It makes a POST request to a `/api/completion` endpoint with a prompt, manages loading
    state, and displays the generated text. This snippet is suitable for integrating AI responses directly into user interfaces.

    ```tsx
    'use client';

    import { useState } from 'react';

    export default function Page() {
      const [generation, setGeneration] = useState('');
      const [isLoading, setIsLoading] = useState(false);

      return (
        <div>
          <div
            onClick={async () => {
              setIsLoading(true);

              await fetch('/api/completion', {
                method: 'POST',
                body: JSON.stringify({
                  prompt: 'Why is the sky blue?',
                }),
              }).then(response => {
                response.json().then(json => {
                  setGeneration(json.text);
                  setIsLoading(false);
                });
              });
            }}
          >
            Generate
          </div>

          {isLoading ? 'Loading...' : generation}
        </div>
      );
    }
    ```

    --------------------------------

    ### Server-Side UI Streaming with AI SDK RSC createStreamableUI (Next.js Action)

    Source: https://github.com/vercel/ai/blob/main/content/docs/06-advanced/07-rendering-ui-with-language-models.mdx

    This 'app/action.ts' snippet demonstrates how to leverage '@ai-sdk/rsc''s 'createStreamableUI' function to stream React components directly from the server during an AI model
     generation. Instead of sending raw data for client-side interpretation, the server renders a component (e.g., WeatherCard) and streams its output. This simplifies
    client-side logic and offloads UI rendering to the server, improving maintainability for complex AI applications.

    ```tsx
    import { createStreamableUI } from '@ai-sdk/rsc'

    const uiStream = createStreamableUI();

    const text = generateText({
      model: openai('gpt-3.5-turbo'),
      system: 'you are a friendly assistant',
      prompt: 'what is the weather in SF?',
      tools: {
        getWeather: {
          description: 'Get the weather for a location',
          parameters: z.object({
            city: z.string().describe('The city to get the weather for'),
            unit: z
              .enum(['C', 'F'])
              .describe('The unit to display the temperature in')
          }),
          execute: async ({ city, unit }) => {
            const weather = getWeather({ city, unit })
            const { temperature, unit, description, forecast } = weather

            uiStream.done(
              <WeatherCard
                weather={{
                  temperature: 47,
                  unit: 'F',
                  description: 'sunny',
                  forecast
                }}
              />
            )
          }
        }
      }
    })

    return {
      display: uiStream.value
    }
    ```

    --------------------------------

    ### Create Custom Uppercase Stream Transformation (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/05-generating-text.mdx

    This TypeScript example demonstrates how to implement a custom TransformStream that converts all incoming 'text' chunks to uppercase. It receives available tools and returns
    a transformation function suitable for use in the Vercel AI stream processing pipeline.

    ```ts
    const upperCaseTransform =
      <TOOLS extends ToolSet>() =>
      (options: { tools: TOOLS; stopStream: () => void }) =>
        new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
          transform(chunk, controller) {
            controller.enqueue(
              // for text chunks, convert the text to uppercase:
              chunk.type === 'text'
                ? { ...chunk, text: chunk.text.toUpperCase() }
                : chunk,
            );
          },
        });
    ```

    --------------------------------

    ### Stream Text Responses with AI SDK (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/providers/01-ai-sdk-providers/00-ai-gateway.mdx

    This snippet illustrates how to stream text responses from a language model using the `streamText` function from the AI SDK. It takes an OpenAI model and a prompt, then
    asynchronously iterates over `textStream` to process and print each part of the generated text as it arrives, offering a more responsive user experience.

    ```typescript
    import { streamText } from 'ai';

    const { textStream } = await streamText({
      model: 'openai/gpt-5',
      prompt: 'Explain the benefits of serverless architecture',
    });

    for await (const textPart of textStream) {
      process.stdout.write(textPart);
    }
    ```

    --------------------------------

    ### Stream Text from Image Prompt with AI SDK and Anthropic Claude

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/05-node/22-stream-text-with-image-prompt.mdx

    This snippet demonstrates how to use the Vercel AI SDK to stream text responses from a vision-language model based on both a text prompt and an image input. It utilizes
    Anthropic's Claude 3.5 Sonnet model, reads an image file from the local filesystem, and streams the generated description to the console. Dependencies include
    `@ai-sdk/anthropic`, `ai`, `dotenv`, and `node:fs`.

    ```ts
    import { anthropic } from '@ai-sdk/anthropic';
    import { streamText } from 'ai';
    import 'dotenv/config';
    import fs from 'node:fs';

    async function main() {
      const result = streamText({
        model: anthropic('claude-3-5-sonnet-20240620'),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe the image in detail.' },
              { type: 'image', image: fs.readFileSync('./data/comic-cat.png') },
            ],
          },
        ],
      });

      for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
      }
    }

    main().catch(console.error);
    ```

    --------------------------------

    ### Generate Text API Handler with AI SDK and OpenAI

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/01-next/10-generate-text.mdx

    This Next.js API route (`/api/completion`) serves as the backend for text generation. It receives a prompt from the client, uses the `@ai-sdk/openai` and `ai` modules to
    interact with the OpenAI GPT-4o model, and returns the generated text as a JSON response. This setup is crucial for offloading AI processing to the server.

    ```typescript
    import { openai } from '@ai-sdk/openai';
    import { generateText } from 'ai';

    export async function POST(req: Request) {
      const { prompt }: { prompt: string } = await req.json();

      const { text } = await generateText({
        model: openai('gpt-4o'),
        system: 'You are a helpful assistant.',
        prompt,
      });

      return Response.json({ text });
    }
    ```

    --------------------------------

    ### Generate Text from Chat History using AI SDK and OpenAI

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/05-node/11-generate-text-with-chat-prompt.mdx

    This code snippet demonstrates how to use the AI SDK to generate text based on a series of previous messages, simulating a chat conversation. It utilizes the `generateText`
    function with an OpenAI model (gpt-4o), providing a system prompt and an array of user and assistant messages as input. The output is the generated text from the model.

    ```TypeScript
    import { generateText } from 'ai';
    import { openai } from '@ai-sdk/openai';

    const result = await generateText({
      model: openai('gpt-4o'),
      maxOutputTokens: 1024,
      system: 'You are a helpful chatbot.',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello!' }],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'I need help with my computer.' }],
        },
      ],
    });

    console.log(result.text);
    ```

    --------------------------------

    ### Stream AI-generated JSON objects with streamObject (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/04-ai-sdk-ui/08-object-generation.mdx

    This server-side API route utilizes `streamObject` from the AI SDK to generate structured JSON objects. It takes a context from the request, uses OpenAI's GPT-4.1 model with
    `notificationSchema`, and streams the resulting object back as a text stream response, ensuring `maxDuration` is set for longer streaming operations.

    ```ts
    import { openai } from '@ai-sdk/openai';
    import { streamObject } from 'ai';
    import { notificationSchema } from './schema';

    // Allow streaming responses up to 30 seconds
    export const maxDuration = 30;

    export async function POST(req: Request) {
      const context = await req.json();

      const result = streamObject({
        model: openai('gpt-4.1'),
        schema: notificationSchema,
        prompt:
          `Generate 3 notifications for a messages app in this context:` + context,
      });

      return result.toTextStreamResponse();
    }
    ```

    --------------------------------

    ### Stream UI with OpenAI Model and Text Handling

    Source: https://github.com/vercel/ai/blob/main/content/docs/05-ai-sdk-rsc/02-streaming-react-components.mdx

    This example demonstrates how to use the `streamUI` function from the AI SDK to stream React components. It configures the function with an OpenAI `gpt-4o` model, a specific
    prompt, and a `text` handler to render plain text responses as a `div`. Although no tools are defined, the `streamUI` function ensures that the model's output is streamed as
    a React component rather than raw text.

    ```TypeScript
    const result = await streamUI({
      model: openai('gpt-4o'),
      prompt: 'Get the weather for San Francisco',
      text: ({ content }) => <div>{content}</div>,
      tools: {},
    });
    ```

    --------------------------------

    ### Generate Text with OpenRouter and AI SDK

    Source: https://github.com/vercel/ai/blob/main/content/providers/03-community-providers/13-openrouter.mdx

    Example demonstrating how to use the `generateText` function from the AI SDK with an OpenRouter chat model to produce text based on a given prompt. The generated text is then
     logged to the console.

    ```JavaScript
    import { createOpenRouter } from '@openrouter/ai-sdk-provider';
    import { generateText } from 'ai';

    const openrouter = createOpenRouter({
      apiKey: 'YOUR_OPENROUTER_API_KEY',
    });

    const { text } = await generateText({
      model: openrouter.chat('anthropic/claude-3.5-sonnet'),
      prompt: 'What is OpenRouter?',
    });

    console.log(text);
    ```

    --------------------------------

    ### Stream Text with Anthropic Model and Tool Use

    Source: https://github.com/vercel/ai/blob/main/content/providers/01-ai-sdk-providers/05-anthropic.mdx

    Demonstrates how to perform streaming text generation with an Anthropic model while incorporating tool definition and execution using `streamText` and `tool` from the AI SDK.
     This example defines a `writeFile` tool with Zod schema validation for its input, showcasing structured output and tool call streaming capabilities.

    ```typescript
    import { anthropic } from '@ai-sdk/anthropic';
    import { streamText, tool } from 'ai';
    import { z } from 'zod';

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      tools: {
        writeFile: tool({
          description: 'Write content to a file',
          inputSchema: z.object({
            path: z.string(),
            content: z.string()
          }),
          execute: async ({ path, content }) => {
            // Implementation
            return { success: true };
          }
        })
      },
      prompt: 'Write a short story to story.txt'
    });
    ```

    --------------------------------

    ### Stream AI Chat Completion Text with AI SDK and TypeScript

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/05-node/21-stream-text-with-chat-prompt.mdx

    This snippet shows how to stream text output from an AI chat completion model using the Vercel AI SDK. It utilizes `streamText` from the 'ai' package and the OpenAI model
    from '@ai-sdk/openai' to send a series of messages and then iterate over the `textStream` to print each part to standard output as it's generated. This approach is beneficial
     for handling large responses and providing real-time feedback to users.

    ```TypeScript
    import { streamText } from 'ai';
    import { openai } from '@ai-sdk/openai';

    const result = streamText({
      model: openai('gpt-4o'),
      maxOutputTokens: 1024,
      system: 'You are a helpful chatbot.',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello!' }],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'I need help with my computer.' }],
        },
      ],
    });

    for await (const textPart of result.textStream) {
      process.stdout.write(textPart);
    }
    ```

    --------------------------------

    ### Generate text using DeepInfra language model with AI SDK in TypeScript

    Source: https://github.com/vercel/ai/blob/main/content/providers/01-ai-sdk-providers/11-deepinfra.mdx

    Illustrates how to use a DeepInfra language model (e.g., Llama 3.1) with the AI SDK's `generateText` function. It shows passing the DeepInfra model instance and a prompt to
    receive generated text. This functionality can also be used with `streamText` for streaming responses.

    ```TypeScript
    import { deepinfra } from '@ai-sdk/deepinfra';
    import { generateText } from 'ai';

    const { text } = await generateText({
      model: deepinfra('meta-llama/Meta-Llama-3.1-70B-Instruct'),
      prompt: 'Write a vegetarian lasagna recipe for 4 people.',
    });
    ```

    --------------------------------

    ### Generate Text with OpenAI Model using Vercel AI SDK (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/docs/07-reference/01-ai-sdk-core/01-generate-text.mdx

    This code demonstrates how to use the `generateText` function from the Vercel AI SDK to create text content. It imports the `openai` model and the `generateText` function,
    then calls `generateText` with a prompt to invent a holiday. The generated text is then logged to the console, showcasing a basic text generation workflow.

    ```typescript
    import { openai } from '@ai-sdk/openai';
    import { generateText } from 'ai';

    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt: 'Invent a new holiday and describe its traditions.',
    });

    console.log(text);
    ```

    --------------------------------

    ### Stream Agent UI Messages in TypeScript

    Source: https://github.com/vercel/ai/blob/main/content/docs/07-reference/01-ai-sdk-core/17-create-agent-ui-stream.mdx

    This example shows how to use `createAgentUIStream` to stream UI messages from an AI agent. It initializes a `ToolLoopAgent` with a model and tools, then creates an async
    generator function `streamAgent` that consumes the UI message stream and yields each chunk.

    ```ts
    import { ToolLoopAgent, createAgentUIStream } from 'ai';

    const agent = new ToolLoopAgent({
      model: 'openai/gpt-4o',
      system: 'You are a helpful assistant.',
      tools: { weather: weatherTool, calculator: calculatorTool },
    });

    export async function* streamAgent(messages: unknown[]) {
      const stream = await createAgentUIStream({
        agent,
        messages,
        // ...other options
      });

      for await (const chunk of stream) {
        yield chunk; // UI message chunk object (see UIMessageStream)
      }
    }
    ```

    --------------------------------

    ### Accessing AI Response Sources with streamText (TypeScript/TSX)

    Source: https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/05-generating-text.mdx

    This TypeScript/TSX example illustrates how to access streaming source information from an AI model's response using the `streamText` function. It configures a Google Gemini
    model with a Google Search tool and asynchronously iterates through `result.fullStream` to identify and log `url` type sources as they become available during the streaming
    process.

    ```tsx
    const result = streamText({
      model: google('gemini-2.5-flash'),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: 'List the top 5 San Francisco news from the past week.',
    });

    for await (const part of result.fullStream) {
      if (part.type === 'source' && part.sourceType === 'url') {
        console.log('ID:', part.id);
        console.log('Title:', part.title);
        console.log('URL:', part.url);
        console.log('Provider metadata:', part.providerMetadata);
        console.log();
      }
    }
    ```

    --------------------------------

    ### Stream Text with File Prompt using AI SDK and Node.js

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/05-node/23-stream-text-with-file-prompt.mdx

    This snippet demonstrates how to send file content (e.g., a PDF) to an AI model and stream the text response. It uses the `@ai-sdk/anthropic` and `ai` libraries in Node.js.
    The model receives a user message with both text and file content, then streams the generated text output to the console. Dependencies include `dotenv` for environment
    variables and `node:fs` for file system operations.

    ```typescript
    import { anthropic } from '@ai-sdk/anthropic';
    import { streamText } from 'ai';
    import 'dotenv/config';
    import fs from 'node:fs';

    async function main() {
      const result = streamText({
        model: anthropic('claude-3-5-sonnet-20241022'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What is an embedding model according to this document?',
              },
              {
                type: 'file',
                data: fs.readFileSync('./data/ai.pdf'),
                mediaType: 'application/pdf',
              },
            ],
          },
        ],
      });

      for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
      }
    }

    main().catch(console.error);
    ```

    --------------------------------

    ### Stream AI text directly using Fastify and AI SDK

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/15-api-servers/40-fastify.mdx

    Demonstrates how to use the `textStream` property of the AI SDK result to directly pipe generated text to a Fastify response. This method is simpler for plain text streaming
    compared to data streams, setting only the `Content-Type` header for a standard text response.

    ```typescript
    import { openai } from '@ai-sdk/openai';
    import { streamText } from 'ai';
    import Fastify from 'fastify';

    const fastify = Fastify({ logger: true });

    fastify.post('/', async function (request, reply) {
      const result = streamText({
        model: openai('gpt-4o'),
        prompt: 'Invent a new holiday and describe its traditions.',
      });

      reply.header('Content-Type', 'text/plain; charset=utf-8');

      return reply.send(result.textStream);
    });

    fastify.listen({ port: 8080 });
    ```

    --------------------------------

    ### Generate Text with AI SDK and OpenAI in TypeScript

    Source: https://github.com/vercel/ai/blob/main/content/cookbook/05-node/10-generate-text.mdx

    This snippet demonstrates how to use the `generateText` function from the AI SDK to generate text. It initializes an OpenAI model (gpt-4o) and provides a prompt to get a text
     response. The result is then logged to the console, showcasing a basic LLM text generation use case.

    ```TypeScript
    import { generateText } from 'ai';
    import { openai } from '@ai-sdk/openai';

    const result = await generateText({
      model: openai('gpt-4o'),
      prompt: 'Why is the sky blue?',
    });

    console.log(result);
    ```

    --------------------------------

    ### Generate Text using Google Generative AI with AI SDK

    Source: https://github.com/vercel/ai/blob/main/packages/google/README.md

    An example showcasing how to use the Google Generative AI provider (`google`) with the AI SDK's `generateText` function. It illustrates sending a prompt to a specified Google
     model (e.g., 'gemini-1.5-pro-latest') and receiving a text response.

    ```ts
    import { google } from '@ai-sdk/google';
    import { generateText } from 'ai';

    const { text } = await generateText({
      model: google('gemini-1.5-pro-latest'),
      prompt: 'Write a vegetarian lasagna recipe for 4 people.',
    });
    ```

    --------------------------------

    ### Perform Basic Text Generation with AI SDK (TypeScript)

    Source: https://github.com/vercel/ai/blob/main/content/providers/01-ai-sdk-providers/00-ai-gateway.mdx

    This example demonstrates basic text generation using the `generateText` function from the AI SDK. It specifies an Anthropic model and a prompt to generate a haiku, then logs
     the resulting text to the console. This is a fundamental operation for interacting with language models.

    ```typescript
    import { generateText } from 'ai';

    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      prompt: 'Write a haiku about programming',
    });

    console.log(text);
    ```

    --------------------------------

    ### Generate basic text with Groq provider

    Source: https://github.com/vercel/ai/blob/main/packages/groq/README.md

    Shows a simple example of generating text using the Groq provider and the `generateText` function from the AI SDK. This snippet demonstrates basic text generation without
    utilizing any specific tools.

    ```ts
    import { groq } from '@ai-sdk/groq';
    import { generateText } from 'ai';

    const { text } = await generateText({
      model: groq('gemma2-9b-it'),
      prompt: 'Write a vegetarian lasagna recipe for 4 people.',
    });
    ```

∴ Thinking…

  The user wants me to research the AI SDK documentation to help fix the issues with AI generation using template variables. Let me analyze what I learned from the documentation:

  Key findings:
  1. The current implementation uses streamText with result.toTextStreamResponse() which is correct
  2. The AI SDK supports streaming text generation well
  3. The issue seems to be that the AI-generated templates aren't properly using the variables we define

  Looking at the current code in /app/api/workspaces/[slug]/emails/ai-assist/route.ts:
  - It uses streamText from ai package
  - Uses emailAIConfig.model and emailAIConfig.systemPrompt
  - Calls buildPrompt() which should include all variables
  - Returns result.toTextStreamResponse()

  The problem is likely in how we're constructing the prompt. Let me check the current implementation more carefully.

  From the AI SDK docs, I see that:
  1. streamText takes a system prompt and a prompt parameter
  2. The current code uses system: emailAIConfig.systemPrompt and prompt: fullPrompt
  3. The buildPrompt function constructs the prompt with variable information

  The issue might be:
  1. The system prompt doesn't emphasize using the exact variables
  2. The prompt construction might not be clear enough
  3. The AI might be creating its own variable names instead of using the defined ones
