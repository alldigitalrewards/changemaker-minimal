@auth @smoke
Feature: Authentication
  As a user of the app
  I want to sign up, log in, and log out
  So that I can access protected functionality securely

  Background:
    Given the application is available

  Scenario: Sign up with valid details
    When I visit "/auth/signup"
    And I fill in "email" with a new valid email
    And I fill in "password" with a strong password
    And I submit the form
    Then I should be redirected to the dashboard
    And I should see a success message

  Scenario: Sign up with an existing email
    When I visit "/auth/signup"
    And I fill in "email" with an existing account email
    And I fill in "password" with a strong password
    And I submit the form
    Then I should see an error about the email already being in use

  @outline
  Scenario Outline: Log in outcomes
    When I visit "/auth/login"
    And I fill in "email" with <email>
    And I fill in "password" with <password>
    And I submit the form
    Then I should <result>

    Examples:
      | email                  | password         | result                                 |
      | a.valid@user.test      | correct-password | be redirected to the dashboard         |
      | a.valid@user.test      | wrong-password   | see an authentication error            |
      | unknown@user.test      | any-password     | see an authentication error            |

  Scenario: Logout clears the session
    Given I am logged in
    When I click the "Logout" button
    Then I should be redirected to "/"
    And I should no longer be authenticated

  Scenario: Session persists across reload
    Given I am logged in
    When I reload the page
    Then I should still be authenticated

  Scenario: Protected route redirects when unauthenticated
    Given I am not authenticated
    When I visit "/workspaces"
    Then I should be redirected to "/auth/login"


