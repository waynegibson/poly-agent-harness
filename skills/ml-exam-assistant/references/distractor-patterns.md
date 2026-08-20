# Distractor Patterns and Commonly Confused Concepts

Read this when two options both look defensible, when a question is numerical,
or when it touches one of the confusions below. Exam distractors are not random. They're written to catch specific, predictable errors, so knowing the pattern
usually resolves the option pair directly.

## Contents

- [How distractors are built](#how-distractors-are-built)
- [Concept pairs that get swapped](#concept-pairs-that-get-swapped)
- [Numerical questions](#numerical-questions)
- [Code-trace defaults worth memorizing](#code-trace-defaults-worth-memorizing)

## How distractors are built

**The absolute.** A true statement rewritten with _always / never / only_. L1
_tends to_ produce sparse solutions; it does not _always_. Deep networks _can_
overfit; they do not _always_. If one option says the same thing as another but
harder, the softer one is usually the answer.

**The true-but-irrelevant.** A factually correct statement that doesn't answer
the question asked. Check that the option addresses the actual stem: "which
explains X" is not satisfied by a true fact about Y.

**The swapped definition.** Two related terms with their definitions exchanged
(precision/recall, bagging/boosting, type I/type II). Read the definition, not
the term name, and check it against the term it's attached to.

**The right answer to the wrong step.** In "what should you do _first_"
questions, several options are reasonable actions but only one is the correct
_next_ action. Diagnose before prescribing: high train / low validation accuracy
is overfitting, so regularize or get more data. Don't tune the learning rate.

**The plausible miscalculation.** In numerical questions, the distractors are
the results of specific errors: forgetting bias terms, using the wrong padding,
off-by-one on output dimensions, mixing up which axis is reduced. Getting a
number that matches an option is not confirmation. It may be the error the
option was written to catch.

**The near-synonym.** Two options differing by one word (_standardization_ vs.
_normalization_, _validation_ vs. _test_ set, _epoch_ vs. _iteration_). The
difference is the question.

## Concept pairs that get swapped

- **Precision vs. recall**: precision is true positives / (true positives +
  false positives), of what you flagged how much was right; recall is true
  positives / (true positives + false negatives), of what was there how much you
  caught. Class imbalance questions almost always want recall or F1 score (the
  harmonic mean of precision and recall), not accuracy.
- **Bagging vs. boosting**: bagging trains in parallel on bootstrap samples and
  reduces variance; boosting trains sequentially on the previous model's errors
  and reduces bias (and can overfit).
- **L1 (Lasso) vs. L2 (Ridge)**: L1 penalizes sum of absolute weights, can drive coefficients
  exactly to zero, implicit feature selection; L2 penalizes sum of squares,
  shrinks toward zero without reaching it.
- **Bias vs. variance**: underfitting is high bias (poor on train _and_ test);
  overfitting is high variance (great on train, poor on test).
- **Dropout at train vs. inference**: active during training, disabled at
  inference. Inverted dropout (the standard implementation) rescales during
  _training_, not at inference.
- **Batch normalization at train vs. inference**: batch statistics during
  training, running averages at inference.
- **Sigmoid vs. softmax**: sigmoid for binary or multi-_label_, independent
  per-class probabilities; softmax for multi-_class_, probabilities summing to 1.
- **Validation vs. test set**: validation tunes hyperparameters, test is
  touched once. Any option that tunes on the test set is wrong.
- **Standardization vs. normalization**: standardization is zero mean / unit
  variance; normalization (min-max) rescales to a fixed range, usually [0,1].
- **Principal Component Analysis (PCA) vs. Linear Discriminant Analysis (LDA)**:
  PCA is unsupervised, maximizes variance; LDA is supervised, maximizes class
  separability.
- **Continuous Bag-of-Words (CBOW) vs. Skip-gram**: both are word2vec training
  objectives: CBOW predicts the target word from its surrounding context and
  trains faster on frequent words; Skip-gram predicts the context from the
  target word and does better on rare words and small corpora.
- **Bag-of-Words (BoW) vs. Term Frequency–Inverse Document Frequency (TF-IDF)**:
  BoW counts raw term occurrences; TF-IDF downweights terms that appear across
  many documents, so common words stop dominating the representation.
- **Parameters vs. hyperparameters**: learned from data vs. set before training.
- **Covariance vs. correlation**: correlation is covariance normalized to
  [-1, 1] and is scale-invariant.
- **Vanishing vs. exploding gradients**: saturating activations and depth cause
  vanishing (fixed by ReLU, residuals, careful init); exploding is fixed by
  gradient clipping.

## Numerical questions

**Dense layer parameters:** `inputs × units + units` (the trailing term is the
bias. The most commonly dropped part).

**Conv2D parameters:** `kernel_h × kernel_w × in_channels × filters + filters`.
Independent of the input's spatial size.

**Conv2D output size:** `same` padding with stride 1 preserves H×W; `valid`
padding gives `H - kernel + 1`. General form: `floor((H + 2p - k) / s) + 1`.

**Pooling:** no parameters. `MaxPooling2D(2,2)` halves each spatial dimension
(floor division).

**Flatten:** no parameters; output size is the product of the incoming dimensions.

**Recurrent layer parameters:** a simple Recurrent Neural Network (RNN) layer is
`(units + input_dim) × units + units`; Long Short-Term Memory (LSTM) is that
times 4 (four gates); Gated Recurrent Unit (GRU) times 3 (three gates).

**Embedding layer parameters:** `vocab_size × embedding_dim`, with no bias term.

Work these layer by layer and write the running shape down. Most errors come
from carrying a wrong spatial dimension forward, not from the arithmetic itself.

## Code-trace defaults worth memorizing

- `np.sum` / `np.mean` with no `axis` reduce over _everything_; `axis=0` reduces
  down columns (result has one entry per column), `axis=1` across rows.
- pandas `.mean()` / `.sum()` default to `axis=0` (per column); `.dropna()`
  defaults to `axis=0` and `how='any'`.
- `train_test_split` defaults to `test_size=0.25`, shuffles, and does _not_
  stratify unless `stratify=` is passed.
- sklearn `StandardScaler` is fit on train only; `.fit_transform` on test is a
  leakage error and a common distractor.
- `LogisticRegression` applies L2 regularization by default (`penalty='l2'`).
- Keras `Dense` defaults to `activation=None` (linear), not ReLU.
- Keras losses reduce to a scalar mean by default.
- `model.predict` on a sigmoid output returns probabilities, not classes. Thresholding is a separate step.
- Python slicing `a[i:j]` excludes `j`; negative indices count from the end.
