package com.grash.voiceops;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class ElevenLabsClientTest {

    private static final String SECRET = "wsec_test_secret_value";
    private static final String BODY = "{\"type\":\"post_call_transcription\",\"data\":{\"conversation_id\":\"conv_1\"}}";

    private static ElevenLabsClient client(String secret) {
        return new ElevenLabsClient("key", "agent_1", "", "phone_1", secret, "https://api.elevenlabs.io",
                new ObjectMapper());
    }

    private static String sign(String secret, long timestamp, String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String hash = HexFormat.of().formatHex(mac.doFinal((timestamp + "." + body).getBytes(StandardCharsets.UTF_8)));
        return "t=" + timestamp + ",v0=" + hash;
    }

    private static long now() {
        return System.currentTimeMillis() / 1000;
    }

    @Test
    void acceptsAFreshCorrectSignature() throws Exception {
        assertThat(client(SECRET).isValidWebhookSignature(sign(SECRET, now(), BODY), BODY)).isTrue();
    }

    @Test
    void rejectsATamperedBody() throws Exception {
        String header = sign(SECRET, now(), BODY);
        assertThat(client(SECRET).isValidWebhookSignature(header, BODY.replace("conv_1", "conv_2"))).isFalse();
    }

    @Test
    void rejectsTheWrongSecret() throws Exception {
        assertThat(client(SECRET).isValidWebhookSignature(sign("other_secret", now(), BODY), BODY)).isFalse();
    }

    @Test
    void rejectsAnOldTimestamp() throws Exception {
        long anHourAgo = now() - 60 * 60;
        assertThat(client(SECRET).isValidWebhookSignature(sign(SECRET, anHourAgo, BODY), BODY)).isFalse();
    }

    @Test
    void rejectsMissingOrMalformedHeaders() {
        ElevenLabsClient client = client(SECRET);
        assertThat(client.isValidWebhookSignature(null, BODY)).isFalse();
        assertThat(client.isValidWebhookSignature("garbage", BODY)).isFalse();
        assertThat(client.isValidWebhookSignature("t=abc,v0=00", BODY)).isFalse();
    }

    @Test
    void rejectsEverythingWithoutAConfiguredSecret() throws Exception {
        ElevenLabsClient client = client("");
        assertThat(client.canVerifyWebhooks()).isFalse();
        assertThat(client.isValidWebhookSignature(sign(SECRET, now(), BODY), BODY)).isFalse();
    }

    @Test
    void dispatchAgentFallsBackToTheHotlineAgent() {
        assertThat(client(SECRET).hasSeparateDispatchAgent()).isFalse();
        ElevenLabsClient separate = new ElevenLabsClient("key", "agent_1", "agent_2", "phone_1", SECRET,
                "https://api.elevenlabs.io", new ObjectMapper());
        assertThat(separate.hasSeparateDispatchAgent()).isTrue();
        assertThat(separate.canPlaceOutboundCalls()).isTrue();
    }
}
