import hr.unizg.fer.zemris.ppj.maheri.Logger;
import hr.unizg.fer.zemris.ppj.maheri.lexer.Action;
import hr.unizg.fer.zemris.ppj.maheri.lexer.LexerRule;
import hr.unizg.fer.zemris.ppj.maheri.lexer.LexerState;
import hr.unizg.fer.zemris.ppj.maheri.lexer.actions.ChangeStateAction;
import hr.unizg.fer.zemris.ppj.maheri.lexer.actions.ComeBackAction;
import hr.unizg.fer.zemris.ppj.maheri.lexer.actions.DeclareClassAction;
import hr.unizg.fer.zemris.ppj.maheri.lexer.actions.NewLineAction;
import hr.unizg.fer.zemris.ppj.maheri.lexer.actions.SkipAction;
import hr.unizg.fer.zemris.ppj.maheri.lexergen.InputProcessor;
import hr.unizg.fer.zemris.ppj.maheri.lexergen.RegexToAutomaton;
import hr.unizg.fer.zemris.ppj.maheri.lexergen.structs.LexerRuleDescriptionText;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.ObjectOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * The supposed entry point for the automated submission grader, as outlined in
 * the problem statement.
 * 
 * @author dosvald
 * 
 */
public class GLA {
	
	public static String OUTPUT = "analizator/lexerStates.ser";

	public static void main(String[] args) throws IOException {
		run(System.in);
	}

	public static void run(InputStream in) throws IOException {

		List<String> inputLines = new LinkedList<String>();

		BufferedReader reader = new BufferedReader(new InputStreamReader(in));
		String currentLine;
		while ((currentLine = reader.readLine()) != null) {
			inputLines.add(currentLine);
		}

		List<String> regularDefinitionLines;
		List<String> lexerStateNames;
		List<String> tokenNames;
		List<LexerRuleDescriptionText> lexerRuleDesciptions;

		InputProcessor ip = new InputProcessor(inputLines);

		regularDefinitionLines = ip.getRegularDefinitions();

		lexerStateNames = ip.getLexerStates();
		tokenNames = ip.getTokenNames();
		lexerRuleDesciptions = ip.getLexerRules();

		Map<String, LexerState> lexerStates = new HashMap<String, LexerState>();

		for (LexerRuleDescriptionText r : lexerRuleDesciptions) {
			String stateName = r.getActiveStateName();
			if (!lexerStates.containsKey(stateName)) {
				lexerStates.put(stateName, new LexerState(stateName));
			}
			List<Action> ruleActions = new ArrayList<Action>();
			List<String> stringActions = r.getExtraParameterLines();
			String action = r.getActionName();
			if (action.equals("-")) {
				ruleActions.add(new SkipAction());
			} else {
				ruleActions.add(new DeclareClassAction(action));
			}
			for (String s : stringActions) {
				if (s.startsWith("VRATI_SE")) {
					String[] vratiSeAction = s.split(" ");
					int vratiSeZa = Integer.parseInt(vratiSeAction[1]);
					ruleActions.add(0, new ComeBackAction(vratiSeZa));
				} else if (s.startsWith("UDJI_U_STANJE")) {
					String[] udjiStanjeAction = s.split(" ");
					ruleActions.add(new ChangeStateAction(udjiStanjeAction[1]));
				} else if (s.equals("NOVI_REDAK")) {
					ruleActions.add(new NewLineAction());
				}
			}

			LexerRule tmpRule = new LexerRule(RegexToAutomaton.getAutomaton(r.getRegexString()), ruleActions,
					r.getRegexString());
			lexerStates.get(stateName).addRule(tmpRule);
		}

		File f = new File(OUTPUT);
		f.getParentFile().mkdirs();
		FileOutputStream stream = new FileOutputStream(OUTPUT);
		ObjectOutputStream oStream = new ObjectOutputStream(stream);
		LexerState startState = lexerStates.get(lexerStateNames.get(0));
		Logger.log("About to begin serialization");
		try {
			oStream.writeObject(lexerStates);
			Logger.log("Wrote other states");
			oStream.writeObject(startState);
			Logger.log("Wrote start state");
			oStream.close();
			stream.close();
		} catch (Error e) {
			Logger.log("Scary error!!!");
			e.printStackTrace();
		}
	}
}
