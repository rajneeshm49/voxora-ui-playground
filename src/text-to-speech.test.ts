import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './text-to-speech';

describe('Text to Speech Lambda', () => {
  it('should return 400 when no text is provided', async () => {
    const event = {
      body: JSON.stringify({}),
    } as APIGatewayProxyEvent;

    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toHaveProperty('error');
  });

  it('should return 200 with valid input', async () => {
    const event = {
      body: JSON.stringify({
        text: 'Hello World',
        voice: 'Joanna',
      }),
    } as APIGatewayProxyEvent;

    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toHaveProperty('audioUrl');
  });
});