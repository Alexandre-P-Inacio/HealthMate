import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const activities = [
  {
    id: 1,
    title: 'Water Intake Challenge',
    icon: 'water-outline',
    description: 'Track your daily water intake and earn points for staying hydrated!',
    color: '#4A90E2',
    gradient: ['#4A90E2', '#357ABD'],
    challenge: {
      goal: 8,
      unit: 'glasses',
      tips: [
        'Start your day with a glass of water',
        'Keep a water bottle with you',
        'Set reminders throughout the day',
      ],
    },
  },
  {
    id: 2,
    title: 'Step Counter',
    icon: 'footsteps-outline',
    description: 'Track your daily steps and reach your fitness goals!',
    color: '#50C878',
    gradient: ['#50C878', '#3DA066'],
    challenge: {
      goal: 10000,
      unit: 'steps',
      tips: [
        'Take the stairs instead of the elevator',
        'Go for a walk during lunch break',
        'Park further away from your destination',
      ],
    },
  },
  {
    id: 3,
    title: 'Meditation Timer',
    icon: 'leaf-outline',
    description: 'Take a moment to breathe and find your inner peace.',
    color: '#9B59B6',
    gradient: ['#9B59B6', '#8E44AD'],
    challenge: {
      goal: 10,
      unit: 'minutes',
      tips: [
        'Find a quiet space',
        'Focus on your breath',
        'Start with short sessions',
      ],
    },
  },
  {
    id: 4,
    title: 'Health Quiz',
    icon: 'help-circle-outline',
    description: 'Test your knowledge about health and wellness!',
    color: '#E67E22',
    gradient: ['#E67E22', '#D35400'],
    challenge: {
      questions: [
        {
          question: 'How many glasses of water should you drink daily?',
          options: ['4-6', '6-8', '8-10', '10-12'],
          correct: 1,
        },
        {
          question: 'What is the recommended daily step count?',
          options: ['5,000', '7,500', '10,000', '12,500'],
          correct: 2,
        },
        {
          question: 'How many hours of sleep do adults need?',
          options: ['4-6', '6-8', '8-10', '10-12'],
          correct: 1,
        },
      ],
    },
  },
  {
    id: 5,
    title: 'Memory Game',
    icon: 'brain-outline',
    description: 'Test your memory with this fun card matching game!',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#EE5253'],
    challenge: {
      cards: [
        { id: 1, emoji: '🍎', matched: false },
        { id: 2, emoji: '🍌', matched: false },
        { id: 3, emoji: '🥕', matched: false },
        { id: 4, emoji: '🥦', matched: false },
        { id: 5, emoji: '🍇', matched: false },
        { id: 6, emoji: '🥝', matched: false },
      ],
    },
  },
  {
    id: 6,
    title: 'Quick Math',
    icon: 'calculator-outline',
    description: 'Exercise your brain with quick math challenges!',
    color: '#00B894',
    gradient: ['#00B894', '#00A884'],
    challenge: {
      timeLimit: 30,
      difficulty: 'easy',
    },
  },
];

const FunZone = () => {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [mathProblem, setMathProblem] = useState(null);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathScore, setMathScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [meditationTime, setMeditationTime] = useState(0);
  const [isMeditating, setIsMeditating] = useState(false);
  const [steps, setSteps] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [memoryCards, setMemoryCards] = useState([]);

  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setGameActive(false);
      Alert.alert('Time\'s up!', `Your final score: ${mathScore}`);
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  useEffect(() => {
    if (isMeditating) {
      const timer = setInterval(() => {
        setMeditationTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isMeditating]);

  useEffect(() => {
    if (selectedActivity?.id === 5) {
      const cards = [...selectedActivity.challenge.cards, ...selectedActivity.challenge.cards]
        .map((card, index) => ({ ...card, uniqueId: index }))
        .sort(() => Math.random() - 0.5);
      setMemoryCards(cards);
    }
  }, [selectedActivity]);

  const generateMathProblem = () => {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, answer;

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 25;
        num2 = Math.floor(Math.random() * 25) + 1;
        answer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = num1 * num2;
        break;
    }

    return { num1, num2, operation, answer };
  };

  const startMathGame = () => {
    setMathScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setMathProblem(generateMathProblem());
  };

  const checkMathAnswer = () => {
    if (parseInt(mathAnswer) === mathProblem.answer) {
      setMathScore(prev => prev + 1);
      Alert.alert('Correct!', 'Great job!');
    } else {
      Alert.alert('Incorrect', `The correct answer was ${mathProblem.answer}`);
    }
    setMathAnswer('');
    setMathProblem(generateMathProblem());
  };

  const handleCardFlip = (cardId) => {
    if (flippedCards.length === 2) return;
    
    setFlippedCards(prev => [...prev, cardId]);
    
    if (flippedCards.length === 1) {
      const firstCard = activities[4].challenge.cards.find(card => card.id === flippedCards[0]);
      const secondCard = activities[4].challenge.cards.find(card => card.id === cardId);
      
      if (firstCard.emoji === secondCard.emoji) {
        setMatchedPairs(prev => [...prev, firstCard.id, secondCard.id]);
      }
      
      setTimeout(() => {
        setFlippedCards([]);
      }, 1000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStepCounter = () => (
    <View style={styles.challengeContainer}>
      <View style={styles.stepCounterContainer}>
        <Text style={styles.stepCount}>{steps.toLocaleString()}</Text>
        <Text style={styles.stepLabel}>steps</Text>
        <View style={styles.stepProgressContainer}>
          <View style={[styles.stepProgressBar, { width: `${(steps / selectedActivity.challenge.goal) * 100}%` }]} />
        </View>
        <Text style={styles.stepGoal}>Goal: {selectedActivity.challenge.goal.toLocaleString()} steps</Text>
      </View>
      <View style={styles.stepButtonsContainer}>
        <TouchableOpacity
          style={[styles.stepButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
          onPress={() => setSteps(prev => Math.max(0, prev - 1000))}
        >
          <Ionicons name="remove" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stepButton, { backgroundColor: selectedActivity.color }]}
          onPress={() => setSteps(prev => prev + 1000)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Tips:</Text>
        {selectedActivity.challenge.tips.map((tip, index) => (
          <Text key={index} style={styles.tipText}>• {tip}</Text>
        ))}
      </View>
    </View>
  );

  const renderMeditationTimer = () => (
    <View style={styles.challengeContainer}>
      <View style={styles.meditationContainer}>
        <Text style={styles.meditationTime}>{formatTime(meditationTime)}</Text>
        <View style={styles.meditationControls}>
          <TouchableOpacity
            style={[styles.meditationButton, { backgroundColor: isMeditating ? '#E74C3C' : '#2ECC71' }]}
            onPress={() => {
              setIsMeditating(!isMeditating);
              if (!isMeditating) setMeditationTime(0);
            }}
          >
            <Text style={styles.meditationButtonText}>
              {isMeditating ? 'Stop' : 'Start'} Meditation
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.meditationButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={() => {
              setMeditationTime(0);
              setIsMeditating(false);
            }}
          >
            <Text style={styles.meditationButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Tips:</Text>
        {selectedActivity.challenge.tips.map((tip, index) => (
          <Text key={index} style={styles.tipText}>• {tip}</Text>
        ))}
      </View>
    </View>
  );

  const renderQuiz = () => {
    if (showResults) {
      return (
        <View style={styles.quizResults}>
          <Text style={styles.quizResultsTitle}>Quiz Complete! 🎉</Text>
          <Text style={styles.quizResultsScore}>
            Your Score: {score} / {selectedActivity.challenge.questions.length}
          </Text>
          <TouchableOpacity
            style={[styles.quizButton, { backgroundColor: selectedActivity.color }]}
            onPress={() => {
              setShowResults(false);
              setCurrentQuestion(0);
              setScore(0);
              setSelectedOption(null);
            }}
          >
            <Text style={styles.quizButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const question = selectedActivity.challenge.questions[currentQuestion];
    return (
      <View style={styles.quizContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                { 
                  backgroundColor: selectedOption === index 
                    ? (index === question.correct ? '#2ECC71' : '#E74C3C')
                    : selectedActivity.color 
                }
              ]}
              onPress={() => {
                setSelectedOption(index);
                setTimeout(() => {
                  if (index === question.correct) {
                    setScore(prev => prev + 1);
                  }
                  if (currentQuestion < selectedActivity.challenge.questions.length - 1) {
                    setCurrentQuestion(prev => prev + 1);
                    setSelectedOption(null);
                  } else {
                    setShowResults(true);
                  }
                }, 1000);
              }}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderMemoryGame = () => {
    const allMatched = memoryCards.every(card => card.matched);

    return (
      <View style={styles.memoryGameContainer}>
        <Text style={styles.memoryGameTitle}>Match the healthy foods!</Text>
        <View style={styles.memoryGrid}>
          {memoryCards.map((card) => (
            <TouchableOpacity
              key={card.uniqueId}
              style={[
                styles.memoryCard,
                flippedCards.includes(card.uniqueId) && styles.memoryCardFlipped,
                card.matched && styles.memoryCardMatched,
              ]}
              onPress={() => {
                if (flippedCards.length === 2 || card.matched) return;
                
                const newFlippedCards = [...flippedCards, card.uniqueId];
                setFlippedCards(newFlippedCards);

                if (newFlippedCards.length === 2) {
                  const [firstId, secondId] = newFlippedCards;
                  const firstCard = memoryCards.find(c => c.uniqueId === firstId);
                  const secondCard = memoryCards.find(c => c.uniqueId === secondId);

                  if (firstCard.emoji === secondCard.emoji) {
                    setMemoryCards(prev => prev.map(c => 
                      c.emoji === firstCard.emoji ? { ...c, matched: true } : c
                    ));
                  }

                  setTimeout(() => {
                    setFlippedCards([]);
                  }, 1000);
                }
              }}
            >
              <Text style={styles.memoryCardText}>
                {flippedCards.includes(card.uniqueId) || card.matched ? card.emoji : '?'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {allMatched && (
          <View style={styles.memoryGameComplete}>
            <Text style={styles.memoryGameCompleteText}>Congratulations! 🎉</Text>
            <TouchableOpacity
              style={[styles.memoryGameRestartButton, { backgroundColor: selectedActivity.color }]}
              onPress={() => {
                const newCards = [...selectedActivity.challenge.cards, ...selectedActivity.challenge.cards]
                  .map((card, index) => ({ ...card, uniqueId: index, matched: false }))
                  .sort(() => Math.random() - 0.5);
                setMemoryCards(newCards);
                setFlippedCards([]);
              }}
            >
              <Text style={styles.memoryGameRestartText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderChallenge = () => {
    if (!selectedActivity) return null;

    switch (selectedActivity.id) {
      case 2:
        return renderStepCounter();
      case 3:
        return renderMeditationTimer();
      case 4:
        return renderQuiz();
      case 5:
        return renderMemoryGame();
      default:
        return (
          <View style={styles.challengeContainer}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${(progress / selectedActivity.challenge.goal) * 100}%` }]} />
              <Text style={styles.progressText}>
                {progress} / {selectedActivity.challenge.goal} {selectedActivity.challenge.unit}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.progressButton, { backgroundColor: selectedActivity.color }]}
              onPress={() => setProgress(prev => Math.min(prev + 1, selectedActivity.challenge.goal))}
            >
              <Text style={styles.progressButtonText}>Add Progress</Text>
            </TouchableOpacity>
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips:</Text>
              {selectedActivity.challenge.tips.map((tip, index) => (
                <Text key={index} style={styles.tipText}>• {tip}</Text>
              ))}
            </View>
          </View>
        );
    }
  };

  const renderActivity = (activity) => (
    <TouchableOpacity
      key={activity.id}
      style={styles.activityCard}
      onPress={() => {
        setSelectedActivity(activity);
        setProgress(0);
        setCurrentQuestion(0);
        setScore(0);
        setShowResults(false);
        setFlippedCards([]);
        setMatchedPairs([]);
        setMathScore(0);
        setTimeLeft(30);
        setGameActive(false);
        setMeditationTime(0);
        setIsMeditating(false);
        setSteps(0);
        setSelectedOption(null);
      }}
    >
      <LinearGradient
        colors={activity.gradient}
        style={styles.activityGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.activityIcon}>
          <Ionicons name={activity.icon} size={32} color="white" />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <Text style={styles.activityDescription}>{activity.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="white" />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fun Zone</Text>
      <Text style={styles.subtitle}>Stay healthy while having fun! 🎮</Text>
      <ScrollView 
        style={styles.activitiesContainer}
        contentContainerStyle={{ ...styles.activitiesContent, paddingBottom: 60 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {activities.map(renderActivity)}
      </ScrollView>

      <Modal
        visible={selectedActivity !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedActivity(null)}
      >
        <View style={styles.modalContainer}>
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={{ ...styles.modalScrollContent, paddingBottom: 60 }}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={[styles.modalContent, { backgroundColor: selectedActivity?.color }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedActivity?.title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedActivity(null)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              {renderChallenge()}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  activitiesContainer: {
    flex: 1,
  },
  activitiesContent: {
    paddingBottom: 20,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  activityIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  activityDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollView: {
    flex: 1,
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    width: '90%',
    borderRadius: 15,
    padding: 20,
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  challengeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
  },
  progressContainer: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: 'white',
    fontSize: 12,
    lineHeight: 20,
  },
  progressButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  progressButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
  },
  tipsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  quizContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
  },
  questionText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  quizResults: {
    alignItems: 'center',
    padding: 20,
  },
  quizResultsTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  quizResultsScore: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  quizButton: {
    padding: 15,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  quizButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  memoryGameContainer: {
    alignItems: 'center',
    padding: 15,
    width: '100%',
  },
  memoryGameTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 20,
  },
  memoryCard: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  memoryCardFlipped: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  memoryCardMatched: {
    backgroundColor: 'rgba(46, 204, 113, 0.4)',
  },
  memoryCardText: {
    fontSize: 32,
  },
  memoryGameComplete: {
    alignItems: 'center',
    marginTop: 20,
  },
  memoryGameCompleteText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  memoryGameRestartButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  memoryGameRestartText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepCounterContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    marginBottom: 20,
  },
  stepCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  stepLabel: {
    fontSize: 18,
    color: 'white',
    marginBottom: 15,
  },
  stepProgressContainer: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    marginBottom: 10,
  },
  stepProgressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 5,
  },
  stepGoal: {
    fontSize: 16,
    color: 'white',
  },
  stepButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  stepButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meditationContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    marginBottom: 20,
  },
  meditationTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  meditationControls: {
    flexDirection: 'row',
    gap: 20,
  },
  meditationButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  meditationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FunZone; 