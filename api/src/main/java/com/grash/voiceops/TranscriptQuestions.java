package com.grash.voiceops;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Picks out the questions in an agent's reply, so the panel can list what the agent asked the caller.
 */
final class TranscriptQuestions {

    // A sentence ending in a question mark (Latin, Arabic, CJK and Spanish-style marks).
    private static final Pattern QUESTION = Pattern.compile("[^.!?。！？؟]*[?？؟]");

    private TranscriptQuestions() {
    }

    static List<String> extract(String text) {
        List<String> questions = new ArrayList<>();
        if (text == null) return questions;
        Matcher matcher = QUESTION.matcher(text);
        while (matcher.find()) {
            String question = matcher.group().trim();
            if (question.length() > 3) questions.add(question);
        }
        return questions;
    }
}
