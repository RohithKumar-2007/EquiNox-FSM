package com.grash.voiceops;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TranscriptQuestionsTest {

    @Test
    void picksOutEachQuestionInAReply() {
        assertThat(TranscriptQuestions.extract(
                "Thanks for reporting it. Is the belt fully stopped? And which line is it on?"))
                .containsExactly("Is the belt fully stopped?", "And which line is it on?");
    }

    @Test
    void handlesSpanishArabicAndCjkQuestionMarks() {
        assertThat(TranscriptQuestions.extract("Gracias. ¿La cinta está detenida por completo?"))
                .containsExactly("¿La cinta está detenida por completo?");
        assertThat(TranscriptQuestions.extract("هل توقف الحزام تماما؟")).hasSize(1);
        assertThat(TranscriptQuestions.extract("ベルトは完全に止まっていますか？")).hasSize(1);
    }

    @Test
    void returnsNothingForStatementsOrNull() {
        assertThat(TranscriptQuestions.extract("I have created the work order.")).isEmpty();
        assertThat(TranscriptQuestions.extract(null)).isEmpty();
        assertThat(TranscriptQuestions.extract("Ok?")).isEmpty();
    }
}
